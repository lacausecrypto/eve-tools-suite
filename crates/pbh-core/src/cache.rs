//! Local SQLite cache for resolved pilots and the personal watchlist.
//!
//! The cache is used *synchronously* (never held across an `.await`) so the
//! engine can probe it before fan-out and persist results afterwards. `now`
//! (unix seconds) is always passed in rather than read from the clock, which
//! keeps TTL behaviour deterministic in tests.

use rusqlite::{params, Connection, OptionalExtension};

use crate::error::Result;
use crate::model::{PilotIntel, WatchTag};

pub struct Cache {
    conn: Connection,
}

/// One watchlist row joined with the last-known character name: `(character_id,
/// tag, note, name)`.
pub type WatchlistRow = (i64, WatchTag, String, Option<String>);

/// Bump this whenever the shape of a cached [`PilotIntel`] changes so stale
/// rows are dropped on open (the watchlist is always preserved).
///
/// History: 1 = initial; 2 = `top_ships` carry resolved `ship_name`;
/// 3 = `last_kill_at` populated; 4 = threat v2 (ship groups, gang size,
/// hull-class label, recency-aware score).
const CACHE_VERSION: i64 = 4;

impl Cache {
    /// Open (creating if needed) a cache at `path`.
    pub fn open(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        Self::from_conn(conn)
    }

    /// In-memory cache (tests, ephemeral runs).
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        Self::from_conn(conn)
    }

    fn from_conn(conn: Connection) -> Result<Self> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS pilots (
                character_id INTEGER PRIMARY KEY,
                name         TEXT NOT NULL,
                intel_json   TEXT NOT NULL,
                fetched_at   INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS watchlist (
                character_id INTEGER PRIMARY KEY,
                tag          TEXT NOT NULL,
                note         TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS meta (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        )?;
        let cache = Cache { conn };
        cache.migrate(CACHE_VERSION)?;
        Ok(cache)
    }

    /// Drop cached pilots when the schema version changes (the watchlist is
    /// untouched). Idempotent: a matching version is a no-op.
    fn migrate(&self, version: i64) -> Result<()> {
        let stored: Option<i64> = self
            .conn
            .query_row(
                "SELECT value FROM meta WHERE key = 'schema_version'",
                [],
                |r| r.get::<_, String>(0),
            )
            .optional()?
            .and_then(|s| s.parse().ok());

        if stored != Some(version) {
            self.conn.execute("DELETE FROM pilots", [])?;
            self.conn.execute(
                "INSERT INTO meta (key, value) VALUES ('schema_version', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![version.to_string()],
            )?;
        }
        Ok(())
    }

    /// Fetch a cached pilot if present and fresher than `ttl_secs`.
    /// The returned intel has `from_cache = true` and its watch tag re-applied.
    pub fn get_pilot(
        &self,
        character_id: i64,
        ttl_secs: i64,
        now: i64,
    ) -> Result<Option<PilotIntel>> {
        let row: Option<(String, i64)> = self
            .conn
            .query_row(
                "SELECT intel_json, fetched_at FROM pilots WHERE character_id = ?1",
                params![character_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;

        let Some((json, fetched_at)) = row else {
            return Ok(None);
        };
        if now - fetched_at > ttl_secs {
            return Ok(None);
        }

        let mut intel: PilotIntel = match serde_json::from_str(&json) {
            Ok(v) => v,
            // Corrupt / schema-drifted row: treat as a miss rather than fail.
            Err(_) => return Ok(None),
        };
        intel.from_cache = true;
        intel.watch_tag = self.get_tag(character_id)?;
        Ok(Some(intel))
    }

    /// Insert or replace a pilot row. Only pilots with a known id are stored.
    pub fn put_pilot(&self, intel: &PilotIntel, now: i64) -> Result<()> {
        let Some(id) = intel.character_id else {
            return Ok(());
        };
        let json = serde_json::to_string(intel).expect("PilotIntel serialises");
        self.conn.execute(
            "INSERT INTO pilots (character_id, name, intel_json, fetched_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(character_id) DO UPDATE SET
                name = excluded.name,
                intel_json = excluded.intel_json,
                fetched_at = excluded.fetched_at",
            params![id, intel.name, json, now],
        )?;
        Ok(())
    }

    /// Set or clear a watchlist tag. `tag = None` removes the entry.
    pub fn set_tag(&self, character_id: i64, tag: Option<WatchTag>, note: &str) -> Result<()> {
        match tag {
            Some(tag) => {
                self.conn.execute(
                    "INSERT INTO watchlist (character_id, tag, note) VALUES (?1, ?2, ?3)
                     ON CONFLICT(character_id) DO UPDATE SET tag = excluded.tag, note = excluded.note",
                    params![character_id, tag_str(tag), note],
                )?;
            }
            None => {
                self.conn.execute(
                    "DELETE FROM watchlist WHERE character_id = ?1",
                    params![character_id],
                )?;
            }
        }
        Ok(())
    }

    /// Read the watchlist tag for a character, if any.
    pub fn get_tag(&self, character_id: i64) -> Result<Option<WatchTag>> {
        let tag: Option<String> = self
            .conn
            .query_row(
                "SELECT tag FROM watchlist WHERE character_id = ?1",
                params![character_id],
                |r| r.get(0),
            )
            .optional()?;
        Ok(tag.as_deref().and_then(parse_tag))
    }

    /// Read the stored note for a character (independent of tag).
    pub fn get_note(&self, character_id: i64) -> Result<Option<String>> {
        let note: Option<String> = self
            .conn
            .query_row(
                "SELECT note FROM watchlist WHERE character_id = ?1",
                params![character_id],
                |r| r.get(0),
            )
            .optional()?;
        Ok(note)
    }

    /// Full watchlist joined with the last-known character name from the pilot
    /// cache (so the UI can show names without a network round-trip). Name is
    /// `None` when the character has never been resolved into the cache.
    pub fn watchlist_detailed(&self) -> Result<Vec<WatchlistRow>> {
        let mut stmt = self.conn.prepare(
            "SELECT w.character_id, w.tag, w.note, p.name
             FROM watchlist w
             LEFT JOIN pilots p ON p.character_id = w.character_id
             ORDER BY w.character_id",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, Option<String>>(3)?,
            ))
        })?;
        let mut out = Vec::new();
        for row in rows {
            let (id, tag, note, name) = row?;
            if let Some(tag) = parse_tag(&tag) {
                out.push((id, tag, note, name));
            }
        }
        Ok(out)
    }

    /// All watchlisted characters with their tag and note.
    pub fn all_tags(&self) -> Result<Vec<(i64, WatchTag, String)>> {
        let mut stmt = self
            .conn
            .prepare("SELECT character_id, tag, note FROM watchlist")?;
        let rows = stmt.query_map([], |r| {
            let id: i64 = r.get(0)?;
            let tag: String = r.get(1)?;
            let note: String = r.get(2)?;
            Ok((id, tag, note))
        })?;
        let mut out = Vec::new();
        for row in rows {
            let (id, tag, note) = row?;
            if let Some(tag) = parse_tag(&tag) {
                out.push((id, tag, note));
            }
        }
        Ok(out)
    }
}

fn tag_str(tag: WatchTag) -> &'static str {
    match tag {
        WatchTag::Friend => "friend",
        WatchTag::Foe => "foe",
        WatchTag::Cyno => "cyno",
        WatchTag::Spy => "spy",
    }
}

fn parse_tag(s: &str) -> Option<WatchTag> {
    match s {
        "friend" => Some(WatchTag::Friend),
        "foe" => Some(WatchTag::Foe),
        "cyno" => Some(WatchTag::Cyno),
        "spy" => Some(WatchTag::Spy),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::ThreatLevel;

    fn sample(id: i64) -> PilotIntel {
        PilotIntel {
            name: "Test Pilot".into(),
            character_id: Some(id),
            corporation_id: Some(1),
            corporation_name: Some("Corp".into()),
            alliance_id: None,
            alliance_name: None,
            security_status: Some(-3.2),
            stats: None,
            threat: ThreatLevel::Moderate,
            threat_score: Some(33),
            top_ship_class: None,
            watch_tag: None,
            from_cache: false,
            error: None,
        }
    }

    #[test]
    fn put_then_get_within_ttl() {
        let c = Cache::open_in_memory().unwrap();
        c.put_pilot(&sample(42), 1_000).unwrap();
        let got = c.get_pilot(42, 3600, 1_500).unwrap().unwrap();
        assert_eq!(got.character_id, Some(42));
        assert!(got.from_cache);
        assert_eq!(got.threat_score, Some(33));
    }

    #[test]
    fn expired_entry_is_a_miss() {
        let c = Cache::open_in_memory().unwrap();
        c.put_pilot(&sample(42), 1_000).unwrap();
        // now is well beyond ttl.
        assert!(c.get_pilot(42, 60, 5_000).unwrap().is_none());
    }

    #[test]
    fn missing_entry_is_none() {
        let c = Cache::open_in_memory().unwrap();
        assert!(c.get_pilot(999, 3600, 0).unwrap().is_none());
    }

    #[test]
    fn unresolved_pilot_is_not_persisted() {
        let c = Cache::open_in_memory().unwrap();
        let intel = PilotIntel::unresolved("Ghost", "no id");
        c.put_pilot(&intel, 0).unwrap();
        // Nothing stored because there is no character_id key.
        assert!(c.all_tags().unwrap().is_empty());
    }

    #[test]
    fn watchlist_set_get_clear_and_reapply() {
        let c = Cache::open_in_memory().unwrap();
        c.set_tag(42, Some(WatchTag::Cyno), "seen lighting at gate")
            .unwrap();
        assert_eq!(c.get_tag(42).unwrap(), Some(WatchTag::Cyno));

        // Tag is re-applied when reading the cached pilot.
        c.put_pilot(&sample(42), 1_000).unwrap();
        let got = c.get_pilot(42, 3600, 1_000).unwrap().unwrap();
        assert_eq!(got.watch_tag, Some(WatchTag::Cyno));

        c.set_tag(42, None, "").unwrap();
        assert_eq!(c.get_tag(42).unwrap(), None);
    }

    #[test]
    fn watchlist_detailed_joins_name_and_preserves_note() {
        let c = Cache::open_in_memory().unwrap();
        // Tag a pilot we *have* cached, and one we haven't.
        c.put_pilot(&sample(42), 1_000).unwrap();
        c.set_tag(42, Some(WatchTag::Foe), "primary at gate").unwrap();
        c.set_tag(7, Some(WatchTag::Cyno), "").unwrap();

        let mut rows = c.watchlist_detailed().unwrap();
        rows.sort_by_key(|(id, _, _, _)| *id);
        assert_eq!(rows.len(), 2);

        // id 7: tagged but never cached → no name.
        assert_eq!(rows[0], (7, WatchTag::Cyno, String::new(), None));
        // id 42: cached → name joined, note preserved.
        assert_eq!(rows[1].0, 42);
        assert_eq!(rows[1].1, WatchTag::Foe);
        assert_eq!(rows[1].2, "primary at gate");
        assert_eq!(rows[1].3.as_deref(), Some("Test Pilot"));

        // get_note returns the stored note independent of tag.
        assert_eq!(c.get_note(42).unwrap().as_deref(), Some("primary at gate"));
    }

    #[test]
    fn version_bump_clears_pilots_but_keeps_watchlist() {
        let c = Cache::open_in_memory().unwrap();
        c.put_pilot(&sample(42), 1_000).unwrap();
        c.set_tag(42, Some(WatchTag::Foe), "ganked me").unwrap();

        // Simulate a schema version bump.
        c.migrate(CACHE_VERSION + 1).unwrap();

        // Cached pilot is gone…
        assert!(c.get_pilot(42, 3600, 1_000).unwrap().is_none());
        // …but the watchlist (and its note) survives.
        assert_eq!(c.get_tag(42).unwrap(), Some(WatchTag::Foe));
        assert_eq!(c.get_note(42).unwrap().as_deref(), Some("ganked me"));
    }

    #[test]
    fn all_tags_lists_entries() {
        let c = Cache::open_in_memory().unwrap();
        c.set_tag(1, Some(WatchTag::Friend), "").unwrap();
        c.set_tag(2, Some(WatchTag::Foe), "ganked me").unwrap();
        let mut tags = c.all_tags().unwrap();
        tags.sort_by_key(|(id, _, _)| *id);
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].1, WatchTag::Friend);
        assert_eq!(tags[1].2, "ganked me");
    }
}
