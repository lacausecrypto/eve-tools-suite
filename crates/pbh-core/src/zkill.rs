//! zKillboard `stats` endpoint wrapper.
//!
//! `GET https://zkillboard.com/api/stats/characterID/{id}/` returns a large JSON
//! blob; we extract only the combat summary and the most-flown ships. Every
//! field is treated as optional because zKill omits sections for inactive
//! characters.

use serde::Deserialize;

use crate::error::{Error, Result};
use crate::http::HttpClient;
use crate::model::{KillStats, ShipGroupActivity, ShipUsage};

pub const ZKILL_BASE: &str = "https://zkillboard.com/api";

/// Raw shape of the parts of the stats payload we read.
#[derive(Debug, Default, Deserialize)]
struct RawStats {
    #[serde(default, rename = "dangerRatio")]
    danger_ratio: i64,
    #[serde(default, rename = "gangRatio")]
    gang_ratio: i64,
    #[serde(default, rename = "shipsDestroyed")]
    ships_destroyed: i64,
    #[serde(default, rename = "shipsLost")]
    ships_lost: i64,
    #[serde(default, rename = "soloKills")]
    solo_kills: i64,
    #[serde(default, rename = "iskDestroyed")]
    isk_destroyed: f64,
    #[serde(default, rename = "topAllTime")]
    top_all_time: Vec<TopGroup>,
    /// Per-month activity, keyed "YYYYMM". Used to derive a last-active date.
    #[serde(default)]
    months: std::collections::HashMap<String, RawMonth>,
    /// Per-ship-group activity, keyed by group id. Used for hull-class threat.
    #[serde(default)]
    groups: std::collections::HashMap<String, RawShipGroup>,
    #[serde(default, rename = "avgGangSize")]
    avg_gang_size: f64,
}

#[derive(Debug, Default, Deserialize)]
struct RawShipGroup {
    #[serde(default, rename = "shipsDestroyed")]
    ships_destroyed: i64,
    #[serde(default, rename = "shipsLost")]
    ships_lost: i64,
}

#[derive(Debug, Default, Deserialize)]
struct RawMonth {
    #[serde(default)]
    year: i64,
    #[serde(default)]
    month: i64,
}

#[derive(Debug, Deserialize)]
struct TopGroup {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    data: Vec<TopEntry>,
}

#[derive(Debug, Default, Deserialize)]
struct TopEntry {
    #[serde(default)]
    kills: i64,
    #[serde(default, rename = "shipTypeID")]
    ship_type_id: Option<i64>,
}

/// Reference to a killmail as listed by zKillboard: the hash needed to fetch the
/// full mail from ESI, plus the value summary zKill computes (which ESI does not
/// provide). The value fields power the loss post-mortem's ISK breakdown.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct KillmailRef {
    pub killmail_id: i64,
    pub hash: String,
    pub total_value: f64,
    /// Value of the modules/cargo that were destroyed (not dropped).
    pub destroyed_value: f64,
    /// Value of what dropped (survived as loot).
    pub dropped_value: f64,
    /// Value of the fitted modules (hull + fit), zKill's "fitted" figure.
    pub fitted_value: f64,
    /// True when only NPCs were on the killing side.
    pub npc: bool,
    /// True when zKill flagged this as a solo kill.
    pub solo: bool,
}

impl KillmailRef {
    /// A ref carrying just the id + hash (used when a caller supplies an ESI
    /// link's hash directly and zKill's value summary is unavailable).
    pub fn minimal(killmail_id: i64, hash: impl Into<String>) -> Self {
        KillmailRef {
            killmail_id,
            hash: hash.into(),
            ..Default::default()
        }
    }
}

/// Raw shape of one entry in a zKill killmail list (`.../losses/`, `/killID/`).
#[derive(Debug, Deserialize)]
struct RawKillmailRef {
    killmail_id: i64,
    zkb: RawZkb,
}

#[derive(Debug, Default, Deserialize)]
struct RawZkb {
    hash: String,
    #[serde(default, rename = "totalValue")]
    total_value: f64,
    #[serde(default, rename = "destroyedValue")]
    destroyed_value: f64,
    #[serde(default, rename = "droppedValue")]
    dropped_value: f64,
    #[serde(default, rename = "fittedValue")]
    fitted_value: f64,
    #[serde(default)]
    npc: bool,
    #[serde(default)]
    solo: bool,
}

#[derive(Clone)]
pub struct ZkillClient<H: HttpClient> {
    http: H,
    base: String,
}

impl<H: HttpClient> ZkillClient<H> {
    pub fn new(http: H) -> Self {
        ZkillClient {
            http,
            base: ZKILL_BASE.to_string(),
        }
    }

    pub fn with_base(http: H, base: impl Into<String>) -> Self {
        ZkillClient {
            http,
            base: base.into(),
        }
    }

    /// Fetch and normalise combat stats for a character. Returns a default
    /// (all-zero) [`KillStats`] when the character has no killboard history.
    pub async fn character_stats(&self, character_id: i64) -> Result<KillStats> {
        let url = format!("{}/stats/characterID/{}/", self.base, character_id);
        let value = self.http.get_json(&url).await?;
        let raw: RawStats = serde_json::from_value(value).map_err(|source| Error::Decode {
            context: format!("zkill stats {character_id}"),
            source,
        })?;
        Ok(normalise(raw))
    }

    /// Fetch a character's recent losses (victim killmails), newest first. These
    /// reveal the pilot's own fits and are the basis for fit prediction.
    pub async fn character_losses(&self, character_id: i64) -> Result<Vec<KillmailRef>> {
        self.losses("characterID", character_id).await
    }

    /// Recent losses for an entire corporation — the basis for doctrine
    /// inference when a pilot hasn't personally lost a hull.
    pub async fn corporation_losses(&self, corporation_id: i64) -> Result<Vec<KillmailRef>> {
        self.losses("corporationID", corporation_id).await
    }

    /// Recent losses for an entire alliance (doctrine fallback when there's no
    /// corporation signal).
    pub async fn alliance_losses(&self, alliance_id: i64) -> Result<Vec<KillmailRef>> {
        self.losses("allianceID", alliance_id).await
    }

    /// Recent kills (killmails where the character was an attacker), newest
    /// first — the basis for gang co-occurrence / network analysis.
    pub async fn character_kills(&self, character_id: i64) -> Result<Vec<KillmailRef>> {
        let url = format!("{}/characterID/{}/kills/", self.base, character_id);
        self.fetch_refs(&url, &format!("characterID/{character_id}/kills")).await
    }

    /// Look up a single killmail by id (`GET /killID/{id}/`) to obtain its hash
    /// and value summary. zKill returns a one-element list of the usual shape.
    pub async fn killmail_ref(&self, killmail_id: i64) -> Result<KillmailRef> {
        let url = format!("{}/killID/{}/", self.base, killmail_id);
        let refs = self
            .fetch_refs(&url, &format!("killID/{killmail_id}"))
            .await?;
        refs.into_iter()
            .next()
            .ok_or_else(|| Error::Http(format!("zKill has no entry for killmail {killmail_id}")))
    }

    /// Shared loss-list fetch. `kind` is the zKill entity segment
    /// (`characterID` / `corporationID` / `allianceID`).
    async fn losses(&self, kind: &str, id: i64) -> Result<Vec<KillmailRef>> {
        let url = format!("{}/{}/{}/losses/", self.base, kind, id);
        self.fetch_refs(&url, &format!("{kind}/{id}/losses")).await
    }

    /// Fetch and parse a zKill killmail-ref list, sorted newest first.
    async fn fetch_refs(&self, url: &str, context: &str) -> Result<Vec<KillmailRef>> {
        let value = self.http.get_json(url).await?;
        let raw: Vec<RawKillmailRef> =
            serde_json::from_value(value).map_err(|source| Error::Decode {
                context: format!("zkill {context}"),
                source,
            })?;
        let mut refs: Vec<KillmailRef> = raw
            .into_iter()
            .map(|r| KillmailRef {
                killmail_id: r.killmail_id,
                hash: r.zkb.hash,
                total_value: r.zkb.total_value,
                destroyed_value: r.zkb.destroyed_value,
                dropped_value: r.zkb.dropped_value,
                fitted_value: r.zkb.fitted_value,
                npc: r.zkb.npc,
                solo: r.zkb.solo,
            })
            .collect();
        // killmail_id is monotonic with time → sort newest first defensively.
        refs.sort_by_key(|r| std::cmp::Reverse(r.killmail_id));
        Ok(refs)
    }
}

fn normalise(raw: RawStats) -> KillStats {
    let mut top_ships: Vec<ShipUsage> = raw
        .top_all_time
        .iter()
        .find(|g| g.kind == "ship")
        .map(|g| {
            g.data
                .iter()
                .filter_map(|e| {
                    e.ship_type_id.map(|id| ShipUsage {
                        ship_type_id: id,
                        ship_name: None,
                        count: e.kills,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    // Most-flown first, keep a useful handful.
    top_ships.sort_by_key(|s| std::cmp::Reverse(s.count));
    top_ships.truncate(5);

    // Last active month → unix timestamp of the 1st of that month. zKill's stats
    // don't expose a precise last-kill time, but month-granularity is enough to
    // tell "active now" from "stale for years" at a glance.
    let last_kill_at = raw
        .months
        .values()
        .filter(|m| m.year > 0 && (1..=12).contains(&m.month))
        .max_by_key(|m| (m.year, m.month))
        .map(|m| days_from_civil(m.year, m.month, 1) * 86_400);

    // Ship groups the pilot actually flies (by combined kills + losses),
    // most-active first, capped to keep the cached row small.
    let mut ship_groups: Vec<ShipGroupActivity> = raw
        .groups
        .iter()
        .filter_map(|(id, g)| {
            let count = g.ships_destroyed + g.ships_lost;
            id.parse::<i64>()
                .ok()
                .filter(|_| count > 0)
                .map(|group_id| ShipGroupActivity { group_id, count })
        })
        .collect();
    ship_groups.sort_by_key(|g| std::cmp::Reverse(g.count));
    ship_groups.truncate(30);

    KillStats {
        ships_destroyed: raw.ships_destroyed,
        ships_lost: raw.ships_lost,
        solo_kills: raw.solo_kills,
        danger_ratio: raw.danger_ratio.clamp(0, 100),
        gang_ratio: raw.gang_ratio.clamp(0, 100),
        isk_destroyed: raw.isk_destroyed,
        avg_gang_size: raw.avg_gang_size.max(0.0),
        top_ships,
        ship_groups,
        last_kill_at,
    }
}

/// Days since the Unix epoch for a civil (proleptic Gregorian) date.
/// Howard Hinnant's algorithm — exact, no external crate.
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400; // [0, 399]
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1; // [0, 365]
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; // [0, 146096]
    era * 146097 + doe - 719468
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::MockHttp;
    use serde_json::json;

    fn falcon_payload() -> serde_json::Value {
        json!({
            "dangerRatio": 72,
            "gangRatio": 40,
            "shipsDestroyed": 110,
            "shipsLost": 30,
            "soloKills": 12,
            "iskDestroyed": 1.2e10,
            "topAllTime": [
                {"type": "character", "data": [{"kills": 110, "characterID": 92532650}]},
                {"type": "ship", "data": [
                    {"kills": 49, "shipTypeID": 17726},
                    {"kills": 22, "shipTypeID": 3756},
                    {"kills": 17, "shipTypeID": 11993}
                ]}
            ]
        })
    }

    #[tokio::test]
    async fn parses_and_sorts_top_ships() {
        let mock = MockHttp::new().with_get("/stats/characterID/92532650/", falcon_payload());
        let zk = ZkillClient::with_base(mock, "http://test");
        let stats = zk.character_stats(92532650).await.unwrap();

        assert_eq!(stats.ships_destroyed, 110);
        assert_eq!(stats.ships_lost, 30);
        assert_eq!(stats.danger_ratio, 72);
        assert_eq!(stats.top_ships.len(), 3);
        // Sorted by count descending.
        assert_eq!(stats.top_ships[0].ship_type_id, 17726);
        assert_eq!(stats.top_ships[0].count, 49);
        assert!((stats.kd_ratio() - 110.0 / 30.0).abs() < 1e-9);
    }

    #[tokio::test]
    async fn parses_losses_newest_first() {
        let mock = MockHttp::new().with_get(
            "/characterID/669000721/losses/",
            json!([
                {"killmail_id": 100, "zkb": {"hash": "aaa", "totalValue": 5.0}},
                {"killmail_id": 300, "zkb": {"hash": "ccc", "totalValue": 9.0}},
                {"killmail_id": 200, "zkb": {"hash": "bbb"}}
            ]),
        );
        let zk = ZkillClient::with_base(mock, "http://test");
        let refs = zk.character_losses(669000721).await.unwrap();
        assert_eq!(refs.len(), 3);
        // Sorted newest (highest id) first.
        assert_eq!(refs[0].killmail_id, 300);
        assert_eq!(refs[0].hash, "ccc");
        assert_eq!(refs[2].killmail_id, 100);
        // Missing totalValue defaults to 0.
        assert_eq!(refs[1].total_value, 0.0);
    }

    #[test]
    fn days_from_civil_known_dates() {
        assert_eq!(days_from_civil(1970, 1, 1), 0);
        assert_eq!(days_from_civil(2000, 1, 1), 10957);
        assert_eq!(days_from_civil(2021, 4, 1), 18718);
    }

    #[tokio::test]
    async fn last_kill_at_from_latest_active_month() {
        let mock = MockHttp::new().with_get(
            "/stats/characterID/7/",
            json!({
                "shipsDestroyed": 5,
                "months": {
                    "202011": {"year": 2020, "month": 11},
                    "202104": {"year": 2021, "month": 4},
                    "202101": {"year": 2021, "month": 1}
                }
            }),
        );
        let zk = ZkillClient::with_base(mock, "http://test");
        let stats = zk.character_stats(7).await.unwrap();
        // Latest month is 2021-04 → 2021-04-01 UTC.
        assert_eq!(stats.last_kill_at, Some(18718 * 86_400));
    }

    #[tokio::test]
    async fn empty_payload_yields_zeroed_stats() {
        let mock = MockHttp::new().with_get("/stats/characterID/1/", json!({}));
        let zk = ZkillClient::with_base(mock, "http://test");
        let stats = zk.character_stats(1).await.unwrap();
        assert_eq!(stats, KillStats::default());
        assert_eq!(stats.kd_ratio(), 0.0);
    }
}
