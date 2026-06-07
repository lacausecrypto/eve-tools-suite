//! Domain types shared across the intel engine and exposed over Tauri IPC.

use serde::{Deserialize, Serialize};

/// A character name parsed out of a pasted local-chat / member-list blob.
pub type CharacterName = String;

/// EVE type IDs are plain integers in ESI / zKill.
pub type TypeId = i64;

/// Threat bucket used to colour and sort the pilot table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThreatLevel {
    /// New / harmless (low killcount, positive sec status, frigates only).
    Harmless,
    /// Some PvP history, nothing scary.
    Moderate,
    /// Active PvPer flying combat-capable ships.
    Dangerous,
    /// Prolific killer, capitals/T3/blops, or known hostile.
    Deadly,
    /// Could not be resolved (unknown / NPC / structure name).
    Unknown,
}

impl ThreatLevel {
    /// Higher = more dangerous; used for stable descending sort.
    pub fn rank(self) -> u8 {
        match self {
            ThreatLevel::Unknown => 0,
            ThreatLevel::Harmless => 1,
            ThreatLevel::Moderate => 2,
            ThreatLevel::Dangerous => 3,
            ThreatLevel::Deadly => 4,
        }
    }
}

/// Manual classification a user can pin onto a character.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WatchTag {
    Friend,
    Foe,
    Cyno,
    Spy,
}

/// One ship the pilot has been seen flying, with how often.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ShipUsage {
    pub ship_type_id: TypeId,
    /// Resolved ship name (filled in from the SDE / ESI names endpoint when available).
    #[serde(default)]
    pub ship_name: Option<String>,
    /// Number of kills involving this ship (from zKill `topAllTime` / recent activity).
    pub count: i64,
}

/// Activity in one EVE ship group (e.g. group 963 = Strategic Cruiser).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ShipGroupActivity {
    pub group_id: i64,
    /// Combined kills + losses the pilot has while flying this group.
    pub count: i64,
}

/// Killboard-derived combat statistics for a character.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct KillStats {
    pub ships_destroyed: i64,
    pub ships_lost: i64,
    pub solo_kills: i64,
    /// zKill "danger" rating 0-100 (share of involvement on the killing side).
    pub danger_ratio: i64,
    /// zKill "gang" rating 0-100 (share of kills made in a gang vs solo).
    pub gang_ratio: i64,
    pub isk_destroyed: f64,
    /// zKill average gang size (how blobby they usually fly).
    #[serde(default)]
    pub avg_gang_size: f64,
    /// Up to a handful of the most-flown ships, most-used first.
    #[serde(default)]
    pub top_ships: Vec<ShipUsage>,
    /// Ship groups the pilot is active in, most-flown first — used to detect
    /// scary hull classes (capitals, T3, recons…) for threat scoring.
    #[serde(default)]
    pub ship_groups: Vec<ShipGroupActivity>,
    /// Unix seconds of the most recent kill activity we know about, if any.
    #[serde(default)]
    pub last_kill_at: Option<i64>,
}

impl KillStats {
    /// Kill/death ratio, guarding against divide-by-zero.
    pub fn kd_ratio(&self) -> f64 {
        if self.ships_lost == 0 {
            self.ships_destroyed as f64
        } else {
            self.ships_destroyed as f64 / self.ships_lost as f64
        }
    }
}

/// Everything we resolved about a single pilot in the pasted list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PilotIntel {
    pub name: CharacterName,
    /// None when the name could not be resolved to a character.
    pub character_id: Option<i64>,
    pub corporation_id: Option<i64>,
    pub corporation_name: Option<String>,
    pub alliance_id: Option<i64>,
    pub alliance_name: Option<String>,
    /// ESI security status (-10.0 .. 5.0).
    pub security_status: Option<f64>,
    pub stats: Option<KillStats>,
    pub threat: ThreatLevel,
    /// Computed 0-100 threat score (None when unknown).
    pub threat_score: Option<u32>,
    /// Notable hull class they fly, e.g. "capitals / blops" (None if unremarkable).
    #[serde(default)]
    pub top_ship_class: Option<String>,
    #[serde(default)]
    pub watch_tag: Option<WatchTag>,
    /// True when this row came from the local cache rather than a fresh fetch.
    #[serde(default)]
    pub from_cache: bool,
    /// Human-readable note when resolution failed.
    #[serde(default)]
    pub error: Option<String>,
}

impl PilotIntel {
    /// Skeleton row for a name we could not resolve.
    pub fn unresolved(name: impl Into<String>, error: impl Into<String>) -> Self {
        PilotIntel {
            name: name.into(),
            character_id: None,
            corporation_id: None,
            corporation_name: None,
            alliance_id: None,
            alliance_name: None,
            security_status: None,
            stats: None,
            threat: ThreatLevel::Unknown,
            threat_score: None,
            top_ship_class: None,
            watch_tag: None,
            from_cache: false,
            error: Some(error.into()),
        }
    }

    /// zKillboard URL for the character (clickable in the UI).
    pub fn zkill_url(&self) -> Option<String> {
        self.character_id
            .map(|id| format!("https://zkillboard.com/character/{id}/"))
    }
}
