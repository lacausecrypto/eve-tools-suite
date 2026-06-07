//! End-to-end orchestration: a pasted local-chat blob → a sorted, threat-scored
//! list of [`PilotIntel`].
//!
//! Network resolution lives here; caching is layered on top by the caller
//! (see [`Engine::resolve_cached`]) so the core fan-out stays free of the
//! synchronous SQLite handle.

use std::collections::BTreeSet;
use std::sync::Arc;

use tokio::sync::Semaphore;
use tokio::task::JoinSet;

use crate::cache::Cache;
use crate::error::Result;
use crate::esi::{CharacterPublic, EsiClient, Killmail};
use crate::fit::{self, FitPrediction, FitSource, LossFit, RawItem};
use crate::intel::{self, NetworkAnalysis};
use crate::postmortem::{self, PostMortem};
use crate::zkill::KillmailRef;
use crate::http::{HttpClient, ReqwestClient};
use crate::model::PilotIntel;
use crate::parse::parse_local;
use crate::threat;
use crate::zkill::ZkillClient;

/// How many pilots to resolve concurrently. The per-host gates in
/// [`ReqwestClient`] are the real throttle; this just caps open sockets.
const DEFAULT_CONCURRENCY: usize = 32;

/// Default cache freshness window: pilots are re-fetched after this many seconds.
pub const DEFAULT_TTL_SECS: i64 = 24 * 3600;

/// How many recent loss killmails to examine when predicting a pilot's fit.
/// Bounds the ESI fan-out per prediction.
pub const DEFAULT_FIT_KILLMAILS: usize = 25;

/// How many recent corp/alliance loss killmails to examine for doctrine
/// inference. Larger than the per-pilot window since org losses are spread
/// across many hulls.
pub const DEFAULT_DOCTRINE_KILLMAILS: usize = 50;

/// Cap on how many doctrine hulls (ones the pilot hasn't personally lost) to
/// surface, most-flown first.
pub const DOCTRINE_SHIP_LIMIT: usize = 4;

/// How many recent kills to examine for gang / network analysis.
pub const DEFAULT_NETWORK_KILLMAILS: usize = 40;

/// Cap on how many frequent wingmen to surface.
pub const NETWORK_COFLYER_LIMIT: usize = 12;

/// How many of a pilot's most recent losses to scan when picking "the latest
/// loss". A pod (capsule) is the throwaway tail of a ship loss and dies *after*
/// the hull, so we look back a few mails to surface the real ship the pilot was
/// flying rather than just their pod.
pub const LATEST_LOSS_SCAN: usize = 4;

pub struct Engine<C: HttpClient + Send + Sync + 'static> {
    esi: EsiClient<Arc<C>>,
    zkill: ZkillClient<Arc<C>>,
    concurrency: usize,
}

impl Engine<ReqwestClient> {
    /// Build the production engine over a shared rate-limited reqwest client.
    pub fn production(user_agent: impl Into<String>) -> Self {
        Engine::with_client(ReqwestClient::new(user_agent))
    }
}

impl<C: HttpClient + Send + Sync + 'static> Engine<C> {
    /// Build an engine over any shared HTTP client (used with mocks in tests).
    pub fn with_client(client: C) -> Self {
        let shared = Arc::new(client);
        Engine {
            esi: EsiClient::new(shared.clone()),
            zkill: ZkillClient::new(shared),
            concurrency: DEFAULT_CONCURRENCY,
        }
    }

    /// Override the base URLs (tests point these at a mock host).
    pub fn with_bases(client: C, esi_base: &str, zkill_base: &str) -> Self {
        let shared = Arc::new(client);
        Engine {
            esi: EsiClient::with_base(shared.clone(), esi_base),
            zkill: ZkillClient::with_base(shared, zkill_base),
            concurrency: DEFAULT_CONCURRENCY,
        }
    }

    /// Parse `pasted` and resolve every name, hitting the network for all of
    /// them. Results are sorted most-dangerous first. `now` is unix seconds
    /// (used for activity-recency in threat scoring).
    pub async fn resolve_pasted(&self, pasted: &str, now: i64) -> Vec<PilotIntel> {
        let names = parse_local(pasted);
        self.resolve_names(&names, now).await
    }

    /// Like [`resolve_pasted`] but consults `cache` first and writes fresh
    /// results back. `now` is unix seconds (injected for determinism).
    pub async fn resolve_cached(
        &self,
        pasted: &str,
        cache: &Cache,
        ttl_secs: i64,
        now: i64,
    ) -> Vec<PilotIntel> {
        let names = parse_local(pasted);
        if names.is_empty() {
            return Vec::new();
        }

        // 1. Resolve names → ids (one batch call) so we can probe the cache by id.
        let id_map = self.esi.resolve_character_ids(&names).await.unwrap_or_default();

        // 2. Split into cache hits and misses, preserving paste order.
        let mut hits: Vec<PilotIntel> = Vec::new();
        let mut miss_names: Vec<String> = Vec::new();
        for name in &names {
            match id_map.get(&name.to_lowercase()) {
                Some(&id) => match cache.get_pilot(id, ttl_secs, now) {
                    Ok(Some(intel)) => hits.push(intel),
                    _ => miss_names.push(name.clone()),
                },
                None => miss_names.push(name.clone()),
            }
        }

        // 3. Resolve the misses over the network, persist them, and re-apply
        //    any watchlist tag the fresh row doesn't yet carry.
        let mut fresh = self.resolve_names(&miss_names, now).await;
        for intel in &mut fresh {
            let _ = cache.put_pilot(intel, now);
            if let Some(id) = intel.character_id {
                if let Ok(tag @ Some(_)) = cache.get_tag(id) {
                    intel.watch_tag = tag;
                }
            }
        }

        let mut all = hits;
        all.extend(fresh);
        sort_by_threat(&mut all);
        all
    }

    /// Resolve names → character ids in a single ESI batch call. Exposed so a
    /// caller managing its own (non-`Send`) cache can probe by id between the
    /// two network phases without holding the cache across an `.await`.
    pub async fn resolve_ids(&self, names: &[String]) -> std::collections::HashMap<String, i64> {
        if names.is_empty() {
            return std::collections::HashMap::new();
        }
        self.esi
            .resolve_character_ids(names)
            .await
            .unwrap_or_default()
    }

    /// Resolve an explicit list of names (already parsed & de-duplicated).
    /// `now` is unix seconds, used for activity-recency in threat scoring.
    pub async fn resolve_names(&self, names: &[String], now: i64) -> Vec<PilotIntel> {
        if names.is_empty() {
            return Vec::new();
        }

        let id_map = self.esi.resolve_character_ids(names).await.unwrap_or_default();

        // Fan out per-character fetches with a concurrency cap.
        let sem = Arc::new(Semaphore::new(self.concurrency));
        let mut set: JoinSet<FetchOutcome> = JoinSet::new();

        for (index, name) in names.iter().enumerate() {
            let id = id_map.get(&name.to_lowercase()).copied();
            let esi = self.esi.clone();
            let zkill = self.zkill.clone();
            let sem = sem.clone();
            let name = name.clone();

            set.spawn(async move {
                let Some(id) = id else {
                    return FetchOutcome::unresolved(index, name);
                };
                let _permit = sem.acquire_owned().await.expect("semaphore open");

                // Character profile and killboard stats are independent → join.
                let (char_res, stats_res) =
                    tokio::join!(esi.character(id), zkill.character_stats(id));

                FetchOutcome {
                    index,
                    name,
                    id: Some(id),
                    character: char_res.ok(),
                    stats: stats_res.ok(),
                }
            });
        }

        let mut outcomes: Vec<FetchOutcome> = Vec::with_capacity(names.len());
        while let Some(joined) = set.join_next().await {
            if let Ok(outcome) = joined {
                outcomes.push(outcome);
            }
        }

        // Resolve corporation / alliance / ship-type names in one batch
        // (universe/names accepts mixed categories).
        let mut name_ids: BTreeSet<i64> = BTreeSet::new();
        for o in &outcomes {
            if let Some(c) = &o.character {
                name_ids.insert(c.corporation_id);
                if let Some(a) = c.alliance_id {
                    name_ids.insert(a);
                }
            }
            if let Some(stats) = &o.stats {
                for ship in &stats.top_ships {
                    name_ids.insert(ship.ship_type_id);
                }
            }
        }
        let name_ids: Vec<i64> = name_ids.into_iter().collect();
        let names_map = self.esi.resolve_names(&name_ids).await.unwrap_or_default();

        // Assemble, restoring paste order.
        outcomes.sort_by_key(|o| o.index);
        let mut pilots: Vec<PilotIntel> = outcomes
            .into_iter()
            .map(|o| o.into_intel(&names_map, now))
            .collect();

        sort_by_threat(&mut pilots);
        pilots
    }

    /// Predict what a pilot is likely flying.
    ///
    /// Primary signal is the pilot's own recent losses. For hulls they haven't
    /// personally lost, we fall back to **doctrine**: the fits their
    /// corporation (or, failing that, alliance) flies, when `corporation_id` /
    /// `alliance_id` are provided. Network-only and cache-free, so it's safe to
    /// call on demand for one pilot.
    pub async fn predict_fit(
        &self,
        character_id: i64,
        corporation_id: Option<i64>,
        alliance_id: Option<i64>,
        max_killmails: usize,
    ) -> FitPrediction {
        // --- 1. The pilot's own losses (strongest signal). ---
        let own_refs = self
            .zkill
            .character_losses(character_id)
            .await
            .unwrap_or_default();
        let own_losses = self.reconstruct(own_refs, max_killmails).await;
        let losses_examined = own_losses.len();

        // Cyno + activity intel reuse the pilot's own reconstructed losses.
        let cyno = intel::assess_cyno(&own_losses);
        let activity = intel::activity_profile(&own_losses);

        let mut ships = fit::aggregate(&own_losses, FitSource::OwnLoss);

        let own_hulls: std::collections::HashSet<i64> =
            ships.iter().map(|s| s.ship_type_id).collect();

        // --- 2. Doctrine fallback: corp first, else alliance. ---
        let doctrine_target = corporation_id
            .map(|id| (id, FitSource::CorpDoctrine))
            .or_else(|| alliance_id.map(|id| (id, FitSource::AllianceDoctrine)));

        if let Some((org_id, source)) = doctrine_target {
            let org_refs = match source {
                FitSource::AllianceDoctrine => self.zkill.alliance_losses(org_id).await,
                _ => self.zkill.corporation_losses(org_id).await,
            }
            .unwrap_or_default();

            let org_losses = self.reconstruct(org_refs, DEFAULT_DOCTRINE_KILLMAILS).await;
            let mut doctrine = fit::aggregate(&org_losses, source);

            // Only hulls the pilot hasn't personally lost; most-flown first.
            doctrine.retain(|s| !own_hulls.contains(&s.ship_type_id));
            doctrine.sort_by_key(|s| std::cmp::Reverse(s.sample_size));
            doctrine.truncate(DOCTRINE_SHIP_LIMIT);

            ships.extend(doctrine);
        }

        // --- 3. Resolve all ship + module type ids to names in one batch. ---
        let mut ids: BTreeSet<i64> = BTreeSet::new();
        for s in &ships {
            ids.insert(s.ship_type_id);
            for m in s
                .high
                .iter()
                .chain(&s.mid)
                .chain(&s.low)
                .chain(&s.rig)
                .chain(&s.other)
            {
                ids.insert(m.type_id);
            }
        }
        let ids: Vec<i64> = ids.into_iter().collect();
        let names = self.esi.resolve_names(&ids).await.unwrap_or_default();
        for s in &mut ships {
            s.ship_name = names.get(&s.ship_type_id).cloned();
            for m in s
                .high
                .iter_mut()
                .chain(s.mid.iter_mut())
                .chain(s.low.iter_mut())
                .chain(s.rig.iter_mut())
                .chain(s.other.iter_mut())
            {
                m.name = names.get(&m.type_id).cloned();
            }
        }

        let note = if !ships.is_empty() {
            None
        } else if losses_examined > 0 {
            Some("recent losses had no fitted modules (pods / empty hulls)".into())
        } else {
            Some("no fitted losses on record for this pilot or their corp/alliance".into())
        };

        FitPrediction {
            character_id,
            ships,
            losses_examined,
            cyno,
            activity,
            note,
        }
    }

    /// Analyze a pilot's gang network from their recent kills: who they most
    /// often appear alongside on killmails. Surfaces a potential gang lurking
    /// outside local. Network-only and cache-free.
    pub async fn analyze_network(&self, character_id: i64, max_killmails: usize) -> NetworkAnalysis {
        let refs = self
            .zkill
            .character_kills(character_id)
            .await
            .unwrap_or_default();
        let refs: Vec<_> = refs.into_iter().take(max_killmails).collect();
        if refs.is_empty() {
            return NetworkAnalysis {
                character_id,
                kills_examined: 0,
                coflyers: Vec::new(),
            };
        }

        // Fetch killmails concurrently, extracting the attacker character ids.
        let sem = Arc::new(Semaphore::new(self.concurrency));
        let mut set: JoinSet<Option<Vec<i64>>> = JoinSet::new();
        for r in refs {
            let esi = self.esi.clone();
            let sem = sem.clone();
            set.spawn(async move {
                let _permit = sem.acquire_owned().await.ok()?;
                let km = esi.killmail(r.killmail_id, &r.hash).await.ok()?;
                Some(km.attackers.iter().filter_map(|a| a.character_id).collect())
            });
        }

        let mut kill_attackers: Vec<Vec<i64>> = Vec::new();
        while let Some(joined) = set.join_next().await {
            if let Ok(Some(attackers)) = joined {
                kill_attackers.push(attackers);
            }
        }
        let kills_examined = kill_attackers.len();

        let mut coflyers =
            intel::top_coflyers(&kill_attackers, character_id, NETWORK_COFLYER_LIMIT);

        // Resolve co-flyer character names in one batch.
        let ids: Vec<i64> = coflyers.iter().map(|c| c.character_id).collect();
        let names = self.esi.resolve_names(&ids).await.unwrap_or_default();
        for c in &mut coflyers {
            c.name = names.get(&c.character_id).cloned();
        }

        NetworkAnalysis {
            character_id,
            kills_examined,
            coflyers,
        }
    }

    /// Resolve a single character name to its id (case-insensitive). `None` when
    /// ESI doesn't match it as a character. Powers the Loss Analyzer's
    /// "paste a pilot name → find their latest loss" flow.
    pub async fn resolve_character(&self, name: &str) -> Option<i64> {
        let map = self
            .esi
            .resolve_character_ids(&[name.to_string()])
            .await
            .ok()?;
        map.get(&name.to_lowercase()).copied()
    }

    /// Post-mortem of one killmail by id. `hash` may be supplied (from an ESI
    /// killmail link); when absent it's looked up via zKill. zKill's value
    /// summary is fetched best-effort and falls back to the supplied hash.
    pub async fn analyze_killmail(
        &self,
        killmail_id: i64,
        hash: Option<String>,
    ) -> Result<PostMortem> {
        let kref = match hash {
            Some(h) => self
                .zkill
                .killmail_ref(killmail_id)
                .await
                .unwrap_or_else(|_| KillmailRef::minimal(killmail_id, h)),
            None => self.zkill.killmail_ref(killmail_id).await?,
        };
        self.analyze_ref(kref).await
    }

    /// Post-mortem of a character's **most recent meaningful loss**.
    ///
    /// When a pilot loses a ship and is then podded, the **pod** killmail is the
    /// newest (it dies after the hull). Naively taking the latest loss would
    /// surface the boring capsule instead of the ship they were flying — so we
    /// scan the most recent few losses and pick the newest **non-capsule** hull,
    /// falling back to the newest loss only if every recent loss is a pod.
    /// `Ok(None)` when the pilot has no losses on record.
    pub async fn analyze_latest_loss(&self, character_id: i64) -> Result<Option<PostMortem>> {
        let refs: Vec<KillmailRef> = self
            .zkill
            .character_losses(character_id)
            .await?
            .into_iter()
            .take(LATEST_LOSS_SCAN)
            .collect();
        if refs.is_empty() {
            return Ok(None);
        }

        // Fetch the candidate killmails concurrently, keeping recency order
        // (refs are already newest-first).
        let sem = Arc::new(Semaphore::new(self.concurrency));
        let mut set: JoinSet<Option<(usize, KillmailRef, Killmail)>> = JoinSet::new();
        for (index, kref) in refs.into_iter().enumerate() {
            let esi = self.esi.clone();
            let sem = sem.clone();
            set.spawn(async move {
                let _permit = sem.acquire_owned().await.ok()?;
                let km = esi.killmail(kref.killmail_id, &kref.hash).await.ok()?;
                Some((index, kref, km))
            });
        }
        let mut got: Vec<(usize, KillmailRef, Killmail)> = Vec::new();
        while let Some(joined) = set.join_next().await {
            if let Ok(Some(t)) = joined {
                got.push(t);
            }
        }
        if got.is_empty() {
            return Ok(None);
        }
        got.sort_by_key(|(index, _, _)| *index);

        // Newest non-capsule hull; fall back to the newest loss overall.
        let pick = got
            .iter()
            .position(|(_, _, km)| !postmortem::is_capsule(km.victim.ship_type_id))
            .unwrap_or(0);
        let (_, kref, km) = got.swap_remove(pick);
        Ok(Some(self.analyze_fetched(km, kref).await))
    }

    /// Fetch the full mail, resolve every entity to a name, build the post-mortem.
    async fn analyze_ref(&self, kref: KillmailRef) -> Result<PostMortem> {
        let km = self.esi.killmail(kref.killmail_id, &kref.hash).await?;
        Ok(self.analyze_fetched(km, kref).await)
    }

    /// Resolve names for an already-fetched killmail and build the post-mortem.
    /// Shared by the by-id path and the latest-loss scan (which fetches the mail
    /// up front to test for pods).
    async fn analyze_fetched(&self, km: Killmail, kref: KillmailRef) -> PostMortem {
        let ids = postmortem::ids_to_resolve(&km);
        let names = self.resolve_names_chunked(&ids).await;
        postmortem::analyze(&km, &kref, &names)
    }

    /// Resolve ids→names in ≤1000-id batches (the `universe/names` cap), merging
    /// the results. Failed batches are skipped (names degrade to ids in the UI).
    async fn resolve_names_chunked(&self, ids: &[i64]) -> std::collections::HashMap<i64, String> {
        let mut out = std::collections::HashMap::new();
        for chunk in ids.chunks(1000) {
            if let Ok(map) = self.esi.resolve_names(chunk).await {
                out.extend(map);
            }
        }
        out
    }

    /// Fetch and reconstruct up to `max` loss killmails into [`LossFit`]s,
    /// newest first. Killmails that fail to fetch or carry no ship are skipped.
    async fn reconstruct(&self, refs: Vec<KillmailRef>, max: usize) -> Vec<LossFit> {
        let refs: Vec<_> = refs.into_iter().take(max).collect();
        if refs.is_empty() {
            return Vec::new();
        }

        let sem = Arc::new(Semaphore::new(self.concurrency));
        let mut set: JoinSet<Option<LossFit>> = JoinSet::new();
        for r in refs {
            let esi = self.esi.clone();
            let sem = sem.clone();
            set.spawn(async move {
                let _permit = sem.acquire_owned().await.ok()?;
                let km = esi.killmail(r.killmail_id, &r.hash).await.ok()?;
                let ship = km.victim.ship_type_id?;
                let items: Vec<RawItem> = km
                    .victim
                    .items
                    .iter()
                    .map(|i| RawItem {
                        type_id: i.item_type_id,
                        flag: i.flag,
                        quantity: i.quantity(),
                    })
                    .collect();
                Some(fit::build_loss_fit(
                    km.killmail_id,
                    km.killmail_time,
                    ship,
                    r.total_value,
                    &items,
                ))
            });
        }

        let mut losses: Vec<LossFit> = Vec::new();
        while let Some(joined) = set.join_next().await {
            if let Ok(Some(lf)) = joined {
                losses.push(lf);
            }
        }
        losses.sort_by_key(|lf| std::cmp::Reverse(lf.killmail_id));
        losses
    }
}

/// Result of one per-pilot fetch task.
struct FetchOutcome {
    index: usize,
    name: String,
    id: Option<i64>,
    character: Option<CharacterPublic>,
    stats: Option<crate::model::KillStats>,
}

impl FetchOutcome {
    fn unresolved(index: usize, name: String) -> Self {
        FetchOutcome {
            index,
            name,
            id: None,
            character: None,
            stats: None,
        }
    }

    fn into_intel(
        self,
        names_map: &std::collections::HashMap<i64, String>,
        now: i64,
    ) -> PilotIntel {
        let Some(id) = self.id else {
            return PilotIntel::unresolved(self.name, "name not found on ESI");
        };
        let Some(character) = self.character else {
            // Resolved to an id but the profile fetch failed.
            let mut intel = PilotIntel::unresolved(self.name, "ESI profile fetch failed");
            intel.character_id = Some(id);
            return intel;
        };

        let (threat, score, top_ship_class) = match &self.stats {
            Some(stats) => {
                let (t, s) = threat::assess(character.security_status, stats, now);
                (t, Some(s), threat::ship_class_label(stats))
            }
            // No killboard data: fall back to a sec-status-only read but mark
            // the score as unknown so the UI can show "no zKill data".
            None => (crate::model::ThreatLevel::Unknown, None, None),
        };

        // Fill in resolved ship names for the "ships flown" column.
        let mut stats = self.stats;
        if let Some(stats) = &mut stats {
            for ship in &mut stats.top_ships {
                ship.ship_name = names_map.get(&ship.ship_type_id).cloned();
            }
        }

        PilotIntel {
            name: character.name,
            character_id: Some(id),
            corporation_id: Some(character.corporation_id),
            corporation_name: names_map.get(&character.corporation_id).cloned(),
            alliance_id: character.alliance_id,
            alliance_name: character.alliance_id.and_then(|a| names_map.get(&a).cloned()),
            security_status: character.security_status,
            stats,
            threat,
            threat_score: score,
            top_ship_class,
            watch_tag: None,
            from_cache: false,
            error: None,
        }
    }
}

/// Sort most-dangerous first: by threat bucket, then score, then name.
pub fn sort_by_threat(pilots: &mut [PilotIntel]) {
    pilots.sort_by(|a, b| {
        b.threat
            .rank()
            .cmp(&a.threat.rank())
            .then(b.threat_score.unwrap_or(0).cmp(&a.threat_score.unwrap_or(0)))
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::MockHttp;
    use serde_json::json;

    /// A mock wired to look like ESI + zKill for two pilots: one deadly outlaw,
    /// one fresh harmless newbro, plus one name that doesn't resolve.
    fn mock() -> MockHttp {
        MockHttp::new()
            .with_post(
                "/universe/ids/",
                json!({"characters": [
                    {"id": 1, "name": "Deadly Pirate"},
                    {"id": 2, "name": "Fresh Newbro"}
                ]}),
            )
            .with_get(
                "/characters/1/",
                json!({"name": "Deadly Pirate", "corporation_id": 500, "alliance_id": 900, "security_status": -9.5}),
            )
            .with_get(
                "/characters/2/",
                json!({"name": "Fresh Newbro", "corporation_id": 501, "security_status": 0.0}),
            )
            .with_get(
                "/stats/characterID/1/",
                json!({"dangerRatio": 90, "shipsDestroyed": 1500, "shipsLost": 80, "soloKills": 200,
                       "avgGangSize": 2.0,
                       "months": {"209901": {"year": 2099, "month": 1}},
                       "groups": {"30": {"shipsDestroyed": 40, "shipsLost": 2}},
                       "topAllTime": [{"type": "ship", "data": [{"kills": 300, "shipTypeID": 17926}]}]}),
            )
            .with_get("/stats/characterID/2/", json!({}))
            .with_post(
                "/universe/names/",
                json!([
                    {"category": "corporation", "id": 500, "name": "Pirate Corp"},
                    {"category": "alliance", "id": 900, "name": "Pirate Alliance"},
                    {"category": "corporation", "id": 501, "name": "School of Applied Knowledge"}
                ]),
            )
    }

    fn engine() -> Engine<MockHttp> {
        Engine::with_bases(mock(), "http://test", "http://test")
    }

    #[tokio::test]
    async fn resolves_sorts_and_scores() {
        let pilots = engine()
            .resolve_pasted("Fresh Newbro\nDeadly Pirate\nGhost McGhost", 1_780_000_000)
            .await;

        assert_eq!(pilots.len(), 3);

        // Deadly pirate sorts first.
        assert_eq!(pilots[0].name, "Deadly Pirate");
        assert_eq!(pilots[0].threat, crate::model::ThreatLevel::Deadly);
        assert_eq!(pilots[0].corporation_name.as_deref(), Some("Pirate Corp"));
        assert_eq!(pilots[0].alliance_name.as_deref(), Some("Pirate Alliance"));
        assert!(pilots[0].threat_score.unwrap() >= 70);

        // Fresh newbro: resolved, harmless, no kb history.
        let newbro = pilots.iter().find(|p| p.name == "Fresh Newbro").unwrap();
        assert_eq!(newbro.threat, crate::model::ThreatLevel::Harmless);
        assert_eq!(
            newbro.corporation_name.as_deref(),
            Some("School of Applied Knowledge")
        );

        // Unresolved name is last and flagged.
        let ghost = pilots.last().unwrap();
        assert_eq!(ghost.name, "Ghost McGhost");
        assert_eq!(ghost.character_id, None);
        assert!(ghost.error.is_some());
    }

    #[tokio::test]
    async fn cache_hit_avoids_refetch_and_marks_source() {
        let cache = Cache::open_in_memory().unwrap();
        let eng = engine();

        // First pass populates the cache.
        let first = eng
            .resolve_cached("Deadly Pirate", &cache, DEFAULT_TTL_SECS, 1_000)
            .await;
        assert_eq!(first.len(), 1);
        assert!(!first[0].from_cache);

        // Second pass within TTL must come from cache.
        let second = eng
            .resolve_cached("Deadly Pirate", &cache, DEFAULT_TTL_SECS, 1_500)
            .await;
        assert_eq!(second.len(), 1);
        assert!(second[0].from_cache);
        assert_eq!(second[0].name, "Deadly Pirate");
    }

    #[tokio::test]
    async fn empty_paste_returns_empty() {
        assert!(engine().resolve_pasted("   \n\n", 0).await.is_empty());
    }

    fn fit_mock() -> MockHttp {
        // Two losses of the same ship (587 = Rifter), similar fits → sample 2.
        let km = |id: i64, t: &str| {
            json!({
                "killmail_id": id,
                "killmail_time": t,
                "victim": {
                    "ship_type_id": 587,
                    "items": [
                        {"item_type_id": 100, "flag": 27, "quantity_destroyed": 1},
                        {"item_type_id": 100, "flag": 28, "quantity_destroyed": 1},
                        {"item_type_id": 300, "flag": 19, "quantity_dropped": 1},
                        {"item_type_id": 400, "flag": 11, "quantity_destroyed": 1},
                        {"item_type_id": 500, "flag": 92, "quantity_dropped": 1},
                        {"item_type_id": 999, "flag": 5, "quantity_dropped": 50}
                    ]
                }
            })
        };
        MockHttp::new()
            .with_get(
                "/characterID/1/losses/",
                json!([
                    {"killmail_id": 1002, "zkb": {"hash": "h2", "totalValue": 2.0e7}},
                    {"killmail_id": 1001, "zkb": {"hash": "h1", "totalValue": 1.5e7}}
                ]),
            )
            .with_get("/killmails/1002/h2/", km(1002, "2026-06-02T10:00:00Z"))
            .with_get("/killmails/1001/h1/", km(1001, "2026-05-01T10:00:00Z"))
            .with_post(
                "/universe/names/",
                json!([
                    {"category": "inventory_type", "id": 587, "name": "Rifter"},
                    {"category": "inventory_type", "id": 100, "name": "200mm AutoCannon II"},
                    {"category": "inventory_type", "id": 300, "name": "1MN Afterburner II"},
                    {"category": "inventory_type", "id": 400, "name": "Damage Control II"},
                    {"category": "inventory_type", "id": 500, "name": "Small Projectile Burst Aerator II"}
                ]),
            )
    }

    #[tokio::test]
    async fn predict_fit_reconstructs_groups_and_names() {
        let eng = Engine::with_bases(fit_mock(), "http://test", "http://test");
        let pred = eng.predict_fit(1, None, None, 10).await;

        assert_eq!(pred.losses_examined, 2);
        assert_eq!(pred.note, None);
        assert_eq!(pred.ships.len(), 1);

        let ship = &pred.ships[0];
        assert_eq!(ship.ship_type_id, 587);
        assert_eq!(ship.ship_name.as_deref(), Some("Rifter"));
        assert_eq!(ship.source, crate::fit::FitSource::OwnLoss);
        assert_eq!(ship.sample_size, 2);
        assert_eq!(ship.killmail_id, 1002); // newest is representative

        // Slots split correctly; cargo (999) excluded.
        assert_eq!(ship.high.len(), 1); // type 100, two lines merged
        assert_eq!(ship.high[0].quantity, 2);
        assert_eq!(ship.high[0].name.as_deref(), Some("200mm AutoCannon II"));
        assert_eq!(ship.mid.len(), 1);
        assert_eq!(ship.low.len(), 1);
        assert_eq!(ship.rig.len(), 1);
        assert!(ship.high.iter().chain(&ship.low).all(|m| m.type_id != 999));

        // Two identical fits → medium-or-better confidence, never zero.
        assert!(ship.confidence >= 55);
    }

    #[tokio::test]
    async fn predict_fit_handles_no_losses() {
        let mock = MockHttp::new().with_get("/characterID/2/losses/", json!([]));
        let eng = Engine::with_bases(mock, "http://test", "http://test");
        // No corp/alliance → no doctrine fallback either.
        let pred = eng.predict_fit(2, None, None, 10).await;
        assert_eq!(pred.losses_examined, 0);
        assert!(pred.ships.is_empty());
        assert!(pred.note.is_some());
    }

    #[tokio::test]
    async fn analyze_network_finds_frequent_wingmen() {
        let km = |id: i64, attackers: &[i64]| {
            json!({
                "killmail_id": id,
                "killmail_time": "2026-01-01T00:00:00Z",
                "victim": {"ship_type_id": 1, "items": []},
                "attackers": attackers.iter().map(|a| json!({"character_id": a})).collect::<Vec<_>>()
            })
        };
        let mock = MockHttp::new()
            .with_get(
                "/characterID/1/kills/",
                json!([
                    {"killmail_id": 1, "zkb": {"hash": "a"}},
                    {"killmail_id": 2, "zkb": {"hash": "b"}},
                    {"killmail_id": 3, "zkb": {"hash": "c"}}
                ]),
            )
            .with_get("/killmails/1/a/", km(1, &[1, 10, 20]))
            .with_get("/killmails/2/b/", km(2, &[1, 10, 20]))
            .with_get("/killmails/3/c/", km(3, &[1, 10]))
            .with_post(
                "/universe/names/",
                json!([
                    {"category": "character", "id": 10, "name": "Wingman A"},
                    {"category": "character", "id": 20, "name": "Wingman B"}
                ]),
            );
        let eng = Engine::with_bases(mock, "http://test", "http://test");
        let net = eng.analyze_network(1, 10).await;

        assert_eq!(net.kills_examined, 3);
        assert_eq!(net.coflyers.len(), 2); // self (1) excluded
        assert_eq!(net.coflyers[0].character_id, 10);
        assert_eq!(net.coflyers[0].kills_together, 3);
        assert_eq!(net.coflyers[0].name.as_deref(), Some("Wingman A"));
        assert_eq!(net.coflyers[1].character_id, 20);
        assert_eq!(net.coflyers[1].kills_together, 2);
    }

    #[tokio::test]
    async fn predict_fit_falls_back_to_corp_doctrine() {
        let km = |id: i64, t: &str| {
            json!({
                "killmail_id": id,
                "killmail_time": t,
                "victim": {
                    "ship_type_id": 587,
                    "items": [
                        {"item_type_id": 100, "flag": 27, "quantity_destroyed": 1},
                        {"item_type_id": 300, "flag": 19, "quantity_dropped": 1},
                        {"item_type_id": 400, "flag": 11, "quantity_destroyed": 1}
                    ]
                }
            })
        };
        let mock = MockHttp::new()
            // Pilot 5 has never lost a ship…
            .with_get("/characterID/5/losses/", json!([]))
            // …but their corp 50 has lost the same hull twice (doctrine).
            .with_get(
                "/corporationID/50/losses/",
                json!([
                    {"killmail_id": 2002, "zkb": {"hash": "d2", "totalValue": 3.0e7}},
                    {"killmail_id": 2001, "zkb": {"hash": "d1", "totalValue": 3.0e7}}
                ]),
            )
            .with_get("/killmails/2002/d2/", km(2002, "2026-06-01T00:00:00Z"))
            .with_get("/killmails/2001/d1/", km(2001, "2026-05-20T00:00:00Z"))
            .with_post(
                "/universe/names/",
                json!([
                    {"category": "inventory_type", "id": 587, "name": "Rifter"},
                    {"category": "inventory_type", "id": 100, "name": "200mm AutoCannon II"},
                    {"category": "inventory_type", "id": 300, "name": "1MN Afterburner II"},
                    {"category": "inventory_type", "id": 400, "name": "Damage Control II"}
                ]),
            );
        let eng = Engine::with_bases(mock, "http://test", "http://test");
        let pred = eng.predict_fit(5, Some(50), Some(900), 25).await;

        assert_eq!(pred.losses_examined, 0); // none of their own
        assert_eq!(pred.ships.len(), 1);
        let ship = &pred.ships[0];
        assert_eq!(ship.ship_type_id, 587);
        assert_eq!(ship.source, crate::fit::FitSource::CorpDoctrine);
        assert_eq!(ship.sample_size, 2);
        assert_eq!(ship.ship_name.as_deref(), Some("Rifter"));
        assert_eq!(ship.high.len(), 1);
        assert!(pred.note.is_none());
    }

    #[tokio::test]
    async fn doctrine_skips_hulls_the_pilot_already_lost() {
        // Pilot 1 (own Rifter loss) + corp also flies Rifter → corp Rifter is
        // suppressed because the pilot's own fit already covers that hull.
        let base = fit_mock();
        let km = json!({
            "killmail_id": 3001,
            "killmail_time": "2026-06-01T00:00:00Z",
            "victim": {"ship_type_id": 587, "items": [
                {"item_type_id": 100, "flag": 27, "quantity_destroyed": 1}
            ]}
        });
        let mock = base
            .with_get(
                "/corporationID/77/losses/",
                json!([{"killmail_id": 3001, "zkb": {"hash": "z1"}}]),
            )
            .with_get("/killmails/3001/z1/", km);
        let eng = Engine::with_bases(mock, "http://test", "http://test");
        let pred = eng.predict_fit(1, Some(77), None, 10).await;

        // Only the pilot's own Rifter; the corp Rifter is filtered out.
        assert_eq!(pred.ships.len(), 1);
        assert_eq!(pred.ships[0].source, crate::fit::FitSource::OwnLoss);
    }

    #[tokio::test]
    async fn latest_loss_skips_the_pod_for_the_real_ship() {
        // Pilot lost a Tayra (650) this morning, then got podded. The pod
        // killmail is newest (id 9002 > 9001) — the analyzer must still surface
        // the Tayra, not the Capsule (670).
        let mock = MockHttp::new()
            .with_get(
                "/characterID/42/losses/",
                json!([
                    {"killmail_id": 9002, "zkb": {"hash": "pod", "totalValue": 1.0e7}},
                    {"killmail_id": 9001, "zkb": {"hash": "tayra", "totalValue": 8.0e7}}
                ]),
            )
            .with_get(
                "/killmails/9002/pod/",
                json!({
                    "killmail_id": 9002,
                    "killmail_time": "2026-06-06T07:31:00Z",
                    "victim": {"ship_type_id": 670, "damage_taken": 600, "items": []},
                    "attackers": [{"character_id": 5001, "ship_type_id": 17619, "damage_done": 600, "final_blow": true}]
                }),
            )
            .with_get(
                "/killmails/9001/tayra/",
                json!({
                    "killmail_id": 9001,
                    "killmail_time": "2026-06-06T07:30:00Z",
                    "victim": {"ship_type_id": 650, "damage_taken": 9000, "items": [
                        {"item_type_id": 100, "flag": 27, "quantity_destroyed": 1}
                    ]},
                    "attackers": [{"character_id": 5001, "corporation_id": 6001,
                        "ship_type_id": 17619, "weapon_type_id": 2929, "damage_done": 9000, "final_blow": true}]
                }),
            )
            .with_post(
                "/universe/names/",
                json!([
                    {"category": "inventory_type", "id": 650, "name": "Tayra"},
                    {"category": "inventory_type", "id": 100, "name": "Expanded Cargohold II"},
                    {"category": "character", "id": 5001, "name": "Ganker One"},
                    {"category": "corporation", "id": 6001, "name": "Gank Corp"},
                    {"category": "inventory_type", "id": 17619, "name": "Catalyst"},
                    {"category": "inventory_type", "id": 2929, "name": "150mm Railgun II"}
                ]),
            );
        let eng = Engine::with_bases(mock, "http://test", "http://test");
        let pm = eng.analyze_latest_loss(42).await.unwrap().expect("a loss");

        // The real ship, not the pod.
        assert_eq!(pm.ship_type_id, Some(650));
        assert_eq!(pm.ship_name.as_deref(), Some("Tayra"));
        assert_eq!(pm.killmail_id, 9001);
        assert_eq!(pm.damage_taken, 9000);
    }

    #[tokio::test]
    async fn latest_loss_returns_pod_when_no_ship_loss_exists() {
        // Degenerate case: only a pod on record → fall back to it.
        let mock = MockHttp::new()
            .with_get(
                "/characterID/7/losses/",
                json!([{"killmail_id": 5, "zkb": {"hash": "pod"}}]),
            )
            .with_get(
                "/killmails/5/pod/",
                json!({
                    "killmail_id": 5,
                    "killmail_time": "2026-06-06T00:00:00Z",
                    "victim": {"ship_type_id": 670, "damage_taken": 500, "items": []},
                    "attackers": [{"character_id": 1, "damage_done": 500, "final_blow": true}]
                }),
            )
            .with_post("/universe/names/", json!([]));
        let eng = Engine::with_bases(mock, "http://test", "http://test");
        let pm = eng.analyze_latest_loss(7).await.unwrap().expect("a loss");
        assert_eq!(pm.ship_type_id, Some(670));
        assert_eq!(pm.killmail_id, 5);
    }
}
