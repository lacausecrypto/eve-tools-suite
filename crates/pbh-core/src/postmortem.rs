//! Loss post-mortem.
//!
//! Turns a fetched killmail (where the pilot was the **victim**) plus zKill's
//! value summary and a resolved id→name map into a digestible breakdown: who
//! killed you, how the damage was applied, the gang composition, the ISK
//! breakdown and the reconstructed fit.
//!
//! Pure and transport-agnostic: every input is already-fetched data, so this is
//! unit-testable without the network. Network fetching + name resolution live in
//! [`crate::engine::Engine::analyze_killmail`].

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::esi::Killmail;
use crate::fit::{build_loss_fit, FitModule, RawItem, Slot};
use crate::zkill::KillmailRef;

/// How many top-damage attackers to surface individually.
const TOP_DAMAGE_LIMIT: usize = 10;

/// Capsule ("pod") type ids: the plain Capsule and the Genolution capsule. A pod
/// loss is the throwaway tail of a real ship loss, so the "latest loss" flow
/// skips it in favour of the hull the pilot was actually flying.
pub const CAPSULE_TYPE_IDS: [i64; 2] = [670, 33328];

/// True when the hull is a capsule (pod).
pub fn is_capsule(ship_type_id: Option<i64>) -> bool {
    matches!(ship_type_id, Some(id) if CAPSULE_TYPE_IDS.contains(&id))
}

/// Gang-size bucket of the killing side.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GangClass {
    /// One attacker (and not NPCs).
    Solo,
    /// 2–5 attackers.
    SmallGang,
    /// 6–20 attackers.
    Fleet,
    /// 21+ attackers.
    Blob,
    /// Killed by NPCs (rats / sentry / concord).
    Npc,
}

/// One attacker, resolved and with its damage share computed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PmAttacker {
    pub character_id: Option<i64>,
    pub character_name: Option<String>,
    pub corporation_id: Option<i64>,
    pub corporation_name: Option<String>,
    pub alliance_id: Option<i64>,
    pub alliance_name: Option<String>,
    pub ship_type_id: Option<i64>,
    pub ship_name: Option<String>,
    pub weapon_type_id: Option<i64>,
    pub weapon_name: Option<String>,
    pub damage_done: i64,
    pub final_blow: bool,
    /// Share of the victim's total damage taken, 0.0–1.0.
    pub damage_share: f64,
}

/// A counted entity (attacker hull or alliance), most frequent first.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PmCount {
    pub id: i64,
    pub name: Option<String>,
    pub count: i64,
}

/// The victim's reconstructed fit, split by slot (drones + subsystems merged
/// into `drone`).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct PmFit {
    pub high: Vec<FitModule>,
    pub mid: Vec<FitModule>,
    pub low: Vec<FitModule>,
    pub rig: Vec<FitModule>,
    pub drone: Vec<FitModule>,
}

/// Full post-mortem of a single loss.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PostMortem {
    pub killmail_id: i64,
    pub killmail_time: String,
    pub solar_system_id: Option<i64>,
    pub system_name: Option<String>,

    // Victim ------------------------------------------------------------------
    pub victim_character_id: Option<i64>,
    pub victim_character_name: Option<String>,
    pub victim_corporation_id: Option<i64>,
    pub victim_corporation_name: Option<String>,
    pub victim_alliance_id: Option<i64>,
    pub victim_alliance_name: Option<String>,
    pub ship_type_id: Option<i64>,
    pub ship_name: Option<String>,
    pub damage_taken: i64,

    // ISK ---------------------------------------------------------------------
    pub total_value: f64,
    pub destroyed_value: f64,
    pub dropped_value: f64,
    pub fitted_value: f64,
    /// Fraction of total value that dropped as loot (survived), 0.0–1.0.
    pub dropped_ratio: f64,

    // Killing side ------------------------------------------------------------
    pub attacker_count: i64,
    pub npc: bool,
    pub solo: bool,
    pub gang_class: GangClass,
    pub final_blow: Option<PmAttacker>,
    /// Top damage dealers, most damage first (capped).
    pub top_damage: Vec<PmAttacker>,
    /// Attacker hulls by frequency.
    pub ship_breakdown: Vec<PmCount>,
    /// Attacker alliances by frequency (entities without an alliance are skipped).
    pub alliances: Vec<PmCount>,

    // Fit ---------------------------------------------------------------------
    pub fit: PmFit,
}

fn name_of(names: &HashMap<i64, String>, id: Option<i64>) -> Option<String> {
    id.and_then(|i| names.get(&i).cloned())
}

/// Classify the killing side by size (NPC takes precedence).
fn classify(attacker_count: i64, npc: bool) -> GangClass {
    if npc {
        return GangClass::Npc;
    }
    match attacker_count {
        ..=1 => GangClass::Solo,
        2..=5 => GangClass::SmallGang,
        6..=20 => GangClass::Fleet,
        _ => GangClass::Blob,
    }
}

/// Count occurrences of an id (skipping `None`) into a frequency list, resolved
/// and sorted most-frequent first (ties broken by id for determinism).
fn frequency(ids: impl Iterator<Item = Option<i64>>, names: &HashMap<i64, String>) -> Vec<PmCount> {
    let mut counts: HashMap<i64, i64> = HashMap::new();
    for id in ids.flatten() {
        *counts.entry(id).or_insert(0) += 1;
    }
    let mut out: Vec<PmCount> = counts
        .into_iter()
        .map(|(id, count)| PmCount {
            id,
            name: names.get(&id).cloned(),
            count,
        })
        .collect();
    out.sort_by(|a, b| b.count.cmp(&a.count).then(a.id.cmp(&b.id)));
    out
}

/// Build the post-mortem from a fetched killmail, its zKill value summary, and a
/// resolved id→name map (characters, corps, alliances, ship/module types, system).
pub fn analyze(km: &Killmail, kref: &KillmailRef, names: &HashMap<i64, String>) -> PostMortem {
    let v = &km.victim;
    let damage_taken = v.damage_taken;
    let denom = damage_taken.max(1) as f64;

    // Resolve every attacker.
    let mut attackers: Vec<PmAttacker> = km
        .attackers
        .iter()
        .map(|a| PmAttacker {
            character_id: a.character_id,
            character_name: name_of(names, a.character_id),
            corporation_id: a.corporation_id,
            corporation_name: name_of(names, a.corporation_id),
            alliance_id: a.alliance_id,
            alliance_name: name_of(names, a.alliance_id),
            ship_type_id: a.ship_type_id,
            ship_name: name_of(names, a.ship_type_id),
            weapon_type_id: a.weapon_type_id,
            weapon_name: name_of(names, a.weapon_type_id),
            damage_done: a.damage_done,
            final_blow: a.final_blow,
            damage_share: a.damage_done as f64 / denom,
        })
        .collect();

    let final_blow = attackers.iter().find(|a| a.final_blow).cloned();

    // Top damage dealers, most damage first.
    attackers.sort_by(|a, b| b.damage_done.cmp(&a.damage_done));
    let top_damage: Vec<PmAttacker> = attackers.iter().take(TOP_DAMAGE_LIMIT).cloned().collect();

    let ship_breakdown = frequency(km.attackers.iter().map(|a| a.ship_type_id), names);
    let alliances = frequency(km.attackers.iter().map(|a| a.alliance_id), names);

    // Reconstruct the fit from the victim's items (reusing the fit grouping).
    let ship_type_id = v.ship_type_id.unwrap_or(0);
    let items: Vec<RawItem> = v
        .items
        .iter()
        .map(|i| RawItem {
            type_id: i.item_type_id,
            flag: i.flag,
            quantity: i.quantity(),
        })
        .collect();
    let loss_fit = build_loss_fit(
        km.killmail_id,
        km.killmail_time.clone(),
        ship_type_id,
        kref.total_value,
        &items,
    );
    let mut fit = PmFit::default();
    for m in loss_fit.modules {
        match m.slot {
            Slot::High => fit.high.push(m),
            Slot::Mid => fit.mid.push(m),
            Slot::Low => fit.low.push(m),
            Slot::Rig => fit.rig.push(m),
            Slot::Subsystem | Slot::Drone => fit.drone.push(m),
            Slot::Other => {}
        }
    }
    // Resolve fitted module + ship names.
    let resolve_names = |mods: &mut Vec<FitModule>| {
        for m in mods {
            m.name = names.get(&m.type_id).cloned();
        }
    };
    resolve_names(&mut fit.high);
    resolve_names(&mut fit.mid);
    resolve_names(&mut fit.low);
    resolve_names(&mut fit.rig);
    resolve_names(&mut fit.drone);

    let attacker_count = km.attackers.len() as i64;
    // NPC kill when zKill says so, or when no attacker carries a character id.
    let npc = kref.npc || (attacker_count > 0 && km.attackers.iter().all(|a| a.character_id.is_none()));
    let solo = kref.solo || attacker_count == 1;
    let gang_class = classify(attacker_count, npc);

    let total = kref.total_value;
    let dropped_ratio = if total > 0.0 {
        (kref.dropped_value / total).clamp(0.0, 1.0)
    } else {
        0.0
    };

    PostMortem {
        killmail_id: km.killmail_id,
        killmail_time: km.killmail_time.clone(),
        solar_system_id: km.solar_system_id,
        system_name: name_of(names, km.solar_system_id),

        victim_character_id: v.character_id,
        victim_character_name: name_of(names, v.character_id),
        victim_corporation_id: v.corporation_id,
        victim_corporation_name: name_of(names, v.corporation_id),
        victim_alliance_id: v.alliance_id,
        victim_alliance_name: name_of(names, v.alliance_id),
        ship_type_id: v.ship_type_id,
        ship_name: name_of(names, v.ship_type_id),
        damage_taken,

        total_value: total,
        destroyed_value: kref.destroyed_value,
        dropped_value: kref.dropped_value,
        fitted_value: kref.fitted_value,
        dropped_ratio,

        attacker_count,
        npc,
        solo,
        gang_class,
        final_blow,
        top_damage,
        ship_breakdown,
        alliances,

        fit,
    }
}

/// Collect every id in a killmail that should be resolved to a name
/// (characters, corps, alliances, ships, weapons, items, system). De-duplicated.
pub fn ids_to_resolve(km: &Killmail) -> Vec<i64> {
    let mut ids: std::collections::BTreeSet<i64> = std::collections::BTreeSet::new();
    let v = &km.victim;
    for id in [
        v.character_id,
        v.corporation_id,
        v.alliance_id,
        v.ship_type_id,
        km.solar_system_id,
    ]
    .into_iter()
    .flatten()
    {
        ids.insert(id);
    }
    for it in &v.items {
        ids.insert(it.item_type_id);
    }
    for a in &km.attackers {
        for id in [
            a.character_id,
            a.corporation_id,
            a.alliance_id,
            a.ship_type_id,
            a.weapon_type_id,
        ]
        .into_iter()
        .flatten()
        {
            ids.insert(id);
        }
    }
    ids.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample_killmail() -> Killmail {
        serde_json::from_value(json!({
            "killmail_id": 12345,
            "killmail_time": "2026-06-01T12:00:00Z",
            "solar_system_id": 30000142,
            "victim": {
                "character_id": 1001,
                "corporation_id": 2001,
                "alliance_id": 3001,
                "ship_type_id": 587,
                "damage_taken": 5000,
                "items": [
                    {"item_type_id": 100, "flag": 27, "quantity_destroyed": 1},
                    {"item_type_id": 300, "flag": 19, "quantity_dropped": 1},
                    {"item_type_id": 400, "flag": 11, "quantity_destroyed": 1},
                    {"item_type_id": 999, "flag": 5, "quantity_dropped": 50}
                ]
            },
            "attackers": [
                {"character_id": 5001, "corporation_id": 6001, "alliance_id": 7001,
                 "ship_type_id": 17619, "weapon_type_id": 2929, "damage_done": 3000, "final_blow": true},
                {"character_id": 5002, "corporation_id": 6001, "alliance_id": 7001,
                 "ship_type_id": 17619, "weapon_type_id": 2929, "damage_done": 2000, "final_blow": false}
            ]
        }))
        .unwrap()
    }

    fn names() -> HashMap<i64, String> {
        [
            (1001, "Victim Pilot"),
            (2001, "Victim Corp"),
            (3001, "Victim Alliance"),
            (587, "Rifter"),
            (100, "200mm AutoCannon II"),
            (300, "1MN Afterburner II"),
            (400, "Damage Control II"),
            (5001, "Ganker One"),
            (5002, "Ganker Two"),
            (6001, "Gank Corp"),
            (7001, "Gank Alliance"),
            (17619, "Catalyst"),
            (2929, "150mm Railgun II"),
            (30000142, "Jita"),
        ]
        .into_iter()
        .map(|(id, n)| (id, n.to_string()))
        .collect()
    }

    fn ref_with_values() -> KillmailRef {
        KillmailRef {
            killmail_id: 12345,
            hash: "h".into(),
            total_value: 1.0e7,
            destroyed_value: 8.0e6,
            dropped_value: 2.0e6,
            fitted_value: 9.0e6,
            npc: false,
            solo: false,
        }
    }

    #[test]
    fn resolves_victim_and_system() {
        let pm = analyze(&sample_killmail(), &ref_with_values(), &names());
        assert_eq!(pm.victim_character_name.as_deref(), Some("Victim Pilot"));
        assert_eq!(pm.ship_name.as_deref(), Some("Rifter"));
        assert_eq!(pm.system_name.as_deref(), Some("Jita"));
        assert_eq!(pm.damage_taken, 5000);
    }

    #[test]
    fn final_blow_and_damage_shares() {
        let pm = analyze(&sample_killmail(), &ref_with_values(), &names());
        let fb = pm.final_blow.expect("final blow present");
        assert_eq!(fb.character_name.as_deref(), Some("Ganker One"));
        assert_eq!(fb.damage_done, 3000);
        assert!((fb.damage_share - 0.6).abs() < 1e-9);
        // Top damage sorted desc.
        assert_eq!(pm.top_damage[0].damage_done, 3000);
        assert_eq!(pm.top_damage[1].damage_done, 2000);
    }

    #[test]
    fn gang_and_value_breakdown() {
        let pm = analyze(&sample_killmail(), &ref_with_values(), &names());
        assert_eq!(pm.attacker_count, 2);
        assert_eq!(pm.gang_class, GangClass::SmallGang);
        assert!(!pm.npc);
        // Both attackers in the same hull / alliance → one breakdown row each.
        assert_eq!(pm.ship_breakdown.len(), 1);
        assert_eq!(pm.ship_breakdown[0].count, 2);
        assert_eq!(pm.ship_breakdown[0].name.as_deref(), Some("Catalyst"));
        assert_eq!(pm.alliances[0].count, 2);
        assert!((pm.dropped_ratio - 0.2).abs() < 1e-9);
    }

    #[test]
    fn fit_split_by_slot_excludes_cargo() {
        let pm = analyze(&sample_killmail(), &ref_with_values(), &names());
        assert_eq!(pm.fit.high.len(), 1); // autocannon
        assert_eq!(pm.fit.high[0].name.as_deref(), Some("200mm AutoCannon II"));
        assert_eq!(pm.fit.mid.len(), 1); // afterburner
        assert_eq!(pm.fit.low.len(), 1); // damage control
        // Cargo item 999 excluded everywhere.
        let all_types: Vec<i64> = pm
            .fit
            .high
            .iter()
            .chain(&pm.fit.mid)
            .chain(&pm.fit.low)
            .chain(&pm.fit.rig)
            .chain(&pm.fit.drone)
            .map(|m| m.type_id)
            .collect();
        assert!(!all_types.contains(&999));
    }

    #[test]
    fn npc_kill_detected_without_character_ids() {
        let km: Killmail = serde_json::from_value(json!({
            "killmail_id": 7,
            "killmail_time": "2026-06-01T00:00:00Z",
            "victim": {"ship_type_id": 587, "damage_taken": 100, "items": []},
            "attackers": [{"ship_type_id": 1, "damage_done": 100, "final_blow": true}]
        }))
        .unwrap();
        let pm = analyze(&km, &KillmailRef::minimal(7, "h"), &HashMap::new());
        assert!(pm.npc);
        assert_eq!(pm.gang_class, GangClass::Npc);
    }

    #[test]
    fn ids_to_resolve_is_deduped_and_complete() {
        let ids = ids_to_resolve(&sample_killmail());
        // victim 1001/2001/3001/587, system 30000142, items 100/300/400/999,
        // attackers 5001/5002/6001/7001/17619/2929 → all present, deduped.
        for expected in [1001, 2001, 3001, 587, 30000142, 100, 300, 400, 999, 5001, 5002, 6001, 7001, 17619, 2929] {
            assert!(ids.contains(&expected), "missing {expected}");
        }
        // 6001/7001/17619/2929 appear twice in the mail but once in the list.
        assert_eq!(ids.iter().filter(|&&x| x == 17619).count(), 1);
    }
}
