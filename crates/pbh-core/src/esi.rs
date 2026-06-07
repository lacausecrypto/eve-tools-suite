//! Thin typed wrapper over the public EVE Swagger Interface (ESI) endpoints we
//! need. No authentication is required for any of these.

use std::collections::HashMap;

use serde::Deserialize;
use serde_json::json;

use crate::error::{Error, Result};
use crate::http::HttpClient;

pub const ESI_BASE: &str = "https://esi.evetech.net/latest";

/// Subset of `GET /characters/{id}/` we care about.
#[derive(Debug, Clone, Deserialize)]
pub struct CharacterPublic {
    pub name: String,
    pub corporation_id: i64,
    #[serde(default)]
    pub alliance_id: Option<i64>,
    #[serde(default)]
    pub security_status: Option<f64>,
}

/// One entry of `POST /universe/ids/` → `characters`.
#[derive(Debug, Clone, Deserialize)]
struct IdMatch {
    id: i64,
    name: String,
}

#[derive(Debug, Default, Deserialize)]
struct IdsResponse {
    #[serde(default)]
    characters: Vec<IdMatch>,
}

/// One entry of `POST /universe/names/`.
#[derive(Debug, Clone, Deserialize)]
struct NameMatch {
    id: i64,
    name: String,
}

/// `GET /killmails/{id}/{hash}/` — the full mail (victim fit + attacker side).
///
/// Fields beyond the original fit-prediction subset are all `#[serde(default)]`
/// so existing callers (and tests) are unaffected; the loss post-mortem reads
/// the richer attacker/victim data.
#[derive(Debug, Clone, Deserialize)]
pub struct Killmail {
    pub killmail_id: i64,
    pub killmail_time: String,
    /// System where the kill happened (resolved to a name for the post-mortem).
    #[serde(default)]
    pub solar_system_id: Option<i64>,
    pub victim: KillmailVictim,
    /// Everyone on the killing side — used for gang co-occurrence analysis and
    /// the loss post-mortem (damage, ships, final blow).
    #[serde(default)]
    pub attackers: Vec<KillmailAttacker>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct KillmailAttacker {
    /// Absent for NPC / structure attackers.
    #[serde(default)]
    pub character_id: Option<i64>,
    #[serde(default)]
    pub corporation_id: Option<i64>,
    #[serde(default)]
    pub alliance_id: Option<i64>,
    #[serde(default)]
    pub faction_id: Option<i64>,
    /// Hull the attacker was flying on this mail.
    #[serde(default)]
    pub ship_type_id: Option<i64>,
    /// Weapon (turret / launcher / drone / smartbomb) that did the damage.
    #[serde(default)]
    pub weapon_type_id: Option<i64>,
    /// Damage this attacker applied to the victim.
    #[serde(default)]
    pub damage_done: i64,
    /// Exactly one attacker has `final_blow == true`.
    #[serde(default)]
    pub final_blow: bool,
    #[serde(default)]
    pub security_status: Option<f64>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct KillmailVictim {
    #[serde(default)]
    pub character_id: Option<i64>,
    #[serde(default)]
    pub corporation_id: Option<i64>,
    #[serde(default)]
    pub alliance_id: Option<i64>,
    #[serde(default)]
    pub faction_id: Option<i64>,
    #[serde(default)]
    pub ship_type_id: Option<i64>,
    /// Total damage the victim took before dying.
    #[serde(default)]
    pub damage_taken: i64,
    #[serde(default)]
    pub items: Vec<KillmailItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct KillmailItem {
    pub item_type_id: i64,
    pub flag: i64,
    #[serde(default)]
    pub quantity_dropped: Option<i64>,
    #[serde(default)]
    pub quantity_destroyed: Option<i64>,
}

impl KillmailItem {
    /// Total count of this line, however the items met their end.
    pub fn quantity(&self) -> i64 {
        self.quantity_dropped.unwrap_or(0) + self.quantity_destroyed.unwrap_or(0)
    }
}

/// ESI client generic over the HTTP transport (so it is unit-testable).
#[derive(Clone)]
pub struct EsiClient<H: HttpClient> {
    http: H,
    base: String,
}

impl<H: HttpClient> EsiClient<H> {
    pub fn new(http: H) -> Self {
        EsiClient {
            http,
            base: ESI_BASE.to_string(),
        }
    }

    /// Override the base URL (used in tests).
    pub fn with_base(http: H, base: impl Into<String>) -> Self {
        EsiClient {
            http,
            base: base.into(),
        }
    }

    /// Resolve character names to ids. Returns a map of `name -> id` containing
    /// only the names ESI matched as characters. Names are matched
    /// case-insensitively on our side because ESI echoes its canonical casing.
    pub async fn resolve_character_ids(
        &self,
        names: &[String],
    ) -> Result<HashMap<String, i64>> {
        if names.is_empty() {
            return Ok(HashMap::new());
        }
        let url = format!("{}/universe/ids/?datasource=tranquility", self.base);
        let body = json!(names);
        let value = self.http.post_json(&url, &body).await?;
        let parsed: IdsResponse = serde_json::from_value(value).map_err(|source| Error::Decode {
            context: "universe/ids".into(),
            source,
        })?;

        let mut out = HashMap::new();
        for m in parsed.characters {
            out.insert(m.name.to_lowercase(), m.id);
        }
        Ok(out)
    }

    /// Fetch the public profile (corp, alliance, sec status) of one character.
    pub async fn character(&self, id: i64) -> Result<CharacterPublic> {
        let url = format!("{}/characters/{}/?datasource=tranquility", self.base, id);
        let value = self.http.get_json(&url).await?;
        serde_json::from_value(value).map_err(|source| Error::Decode {
            context: format!("characters/{id}"),
            source,
        })
    }

    /// Fetch a full killmail by id + zKill hash.
    pub async fn killmail(&self, killmail_id: i64, hash: &str) -> Result<Killmail> {
        let url = format!(
            "{}/killmails/{}/{}/?datasource=tranquility",
            self.base, killmail_id, hash
        );
        let value = self.http.get_json(&url).await?;
        serde_json::from_value(value).map_err(|source| Error::Decode {
            context: format!("killmails/{killmail_id}"),
            source,
        })
    }

    /// Batch-resolve corporation / alliance / character ids to names via
    /// `POST /universe/names/`. Returns `id -> name`.
    pub async fn resolve_names(&self, ids: &[i64]) -> Result<HashMap<i64, String>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let url = format!("{}/universe/names/?datasource=tranquility", self.base);
        let body = json!(ids);
        let value = self.http.post_json(&url, &body).await?;
        let parsed: Vec<NameMatch> =
            serde_json::from_value(value).map_err(|source| Error::Decode {
                context: "universe/names".into(),
                source,
            })?;
        Ok(parsed.into_iter().map(|m| (m.id, m.name)).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testutil::MockHttp;
    use serde_json::json;

    #[tokio::test]
    async fn resolves_character_ids_case_insensitively() {
        let mock = MockHttp::new().with_post(
            "/universe/ids/",
            json!({
                "characters": [
                    {"id": 92532650, "name": "CCP Falcon"},
                    {"id": 100, "name": "Solo Roamer"}
                ]
            }),
        );
        let esi = EsiClient::with_base(mock, "http://test");
        let map = esi
            .resolve_character_ids(&["ccp falcon".into(), "Solo Roamer".into()])
            .await
            .unwrap();
        assert_eq!(map.get("ccp falcon"), Some(&92532650));
        assert_eq!(map.get("solo roamer"), Some(&100));
    }

    #[tokio::test]
    async fn parses_character_public() {
        let mock = MockHttp::new().with_get(
            "/characters/92532650/",
            json!({
                "name": "CCP Falcon",
                "corporation_id": 109299958,
                "alliance_id": 434243723,
                "security_status": 3.05
            }),
        );
        let esi = EsiClient::with_base(mock, "http://test");
        let c = esi.character(92532650).await.unwrap();
        assert_eq!(c.corporation_id, 109299958);
        assert_eq!(c.alliance_id, Some(434243723));
        assert!((c.security_status.unwrap() - 3.05).abs() < 1e-9);
    }

    #[tokio::test]
    async fn character_without_alliance_decodes() {
        let mock = MockHttp::new().with_get(
            "/characters/5/",
            json!({"name": "NPC Dude", "corporation_id": 1000035}),
        );
        let esi = EsiClient::with_base(mock, "http://test");
        let c = esi.character(5).await.unwrap();
        assert_eq!(c.alliance_id, None);
        assert_eq!(c.security_status, None);
    }

    #[tokio::test]
    async fn resolve_names_maps_ids() {
        let mock = MockHttp::new().with_post(
            "/universe/names/",
            json!([
                {"category": "corporation", "id": 109299958, "name": "C C P"},
                {"category": "alliance", "id": 434243723, "name": "C C P Alliance"}
            ]),
        );
        let esi = EsiClient::with_base(mock, "http://test");
        let names = esi.resolve_names(&[109299958, 434243723]).await.unwrap();
        assert_eq!(names.get(&109299958).map(String::as_str), Some("C C P"));
    }
}
