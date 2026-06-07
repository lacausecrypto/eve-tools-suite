//! Fit prediction.
//!
//! Given a pilot's recent **losses** (killmails where they were the victim), we
//! reconstruct what they fit on each ship and predict the fit they'll be flying.
//! A loss reveals the victim's actual modules grouped by slot, so a pilot's own
//! recent losses are the strongest signal for what they fly.
//!
//! This module holds the pure logic (slot mapping, per-killmail fit
//! reconstruction, aggregation across losses, and a confidence model). Network
//! fetching lives in [`crate::engine::Engine::predict_fit`].

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

/// Where a predicted fit came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FitSource {
    /// Reconstructed from the pilot's own loss of this hull (strongest signal).
    OwnLoss,
    /// Inferred from the pilot's corporation flying this hull (doctrine).
    CorpDoctrine,
    /// Inferred from the pilot's alliance flying this hull (doctrine).
    AllianceDoctrine,
}

/// Where a module sits on the ship. Derived from the EVE inventory "flag".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Slot {
    High,
    Mid,
    Low,
    Rig,
    Subsystem,
    Drone,
    /// Cargo, fuel bay, fleet hangar, implants… — not part of the fit.
    Other,
}

/// Map an EVE killmail item `flag` to a fitting slot.
///
/// Flag ranges (CCP inventory flags):
/// - 11–18  LoSlot0..7
/// - 19–26  MedSlot0..7
/// - 27–34  HiSlot0..7
/// - 92–99  RigSlot0..7
/// - 125–132 SubSystemSlot0..7
/// - 87     DroneBay
pub fn slot_of(flag: i64) -> Slot {
    match flag {
        11..=18 => Slot::Low,
        19..=26 => Slot::Mid,
        27..=34 => Slot::High,
        92..=99 => Slot::Rig,
        125..=132 => Slot::Subsystem,
        87 => Slot::Drone,
        _ => Slot::Other,
    }
}

/// A fitted item (module / rig / drone / loaded charge), grouped by type.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FitModule {
    pub type_id: i64,
    #[serde(default)]
    pub name: Option<String>,
    /// Summed dropped + destroyed quantity across the killmail.
    pub quantity: i64,
    pub slot: Slot,
}

/// One raw item line from a killmail, before grouping.
#[derive(Debug, Clone)]
pub struct RawItem {
    pub type_id: i64,
    pub flag: i64,
    pub quantity: i64,
}

/// A reconstructed fit from a single loss killmail.
#[derive(Debug, Clone)]
pub struct LossFit {
    pub killmail_id: i64,
    pub killmail_time: String,
    pub ship_type_id: i64,
    pub total_value: f64,
    /// Fitted items only (cargo / bays excluded), grouped by type within the kill.
    pub modules: Vec<FitModule>,
}

/// Build a [`LossFit`] from one killmail's raw items.
///
/// Items in cargo / special bays ([`Slot::Other`]) are dropped. Identical type
/// ids are merged, summing quantity (so eight separate launcher lines become a
/// single `quantity = 8` entry). Result is sorted by slot, then quantity desc.
pub fn build_loss_fit(
    killmail_id: i64,
    killmail_time: String,
    ship_type_id: i64,
    total_value: f64,
    items: &[RawItem],
) -> LossFit {
    let mut grouped: HashMap<i64, FitModule> = HashMap::new();
    for it in items {
        let slot = slot_of(it.flag);
        if slot == Slot::Other {
            continue;
        }
        grouped
            .entry(it.type_id)
            .and_modify(|m| m.quantity += it.quantity)
            .or_insert(FitModule {
                type_id: it.type_id,
                name: None,
                quantity: it.quantity,
                slot,
            });
    }

    let mut modules: Vec<FitModule> = grouped.into_values().collect();
    modules.sort_by(|a, b| {
        slot_rank(a.slot)
            .cmp(&slot_rank(b.slot))
            .then(b.quantity.cmp(&a.quantity))
            .then(a.type_id.cmp(&b.type_id))
    });

    LossFit {
        killmail_id,
        killmail_time,
        ship_type_id,
        total_value,
        modules,
    }
}

fn slot_rank(slot: Slot) -> u8 {
    match slot {
        Slot::High => 0,
        Slot::Mid => 1,
        Slot::Low => 2,
        Slot::Rig => 3,
        Slot::Subsystem => 4,
        Slot::Drone => 5,
        Slot::Other => 6,
    }
}

/// A predicted fit for one ship the pilot has flown, split into slot lists.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PredictedShip {
    pub ship_type_id: i64,
    #[serde(default)]
    pub ship_name: Option<String>,
    pub high: Vec<FitModule>,
    pub mid: Vec<FitModule>,
    pub low: Vec<FitModule>,
    pub rig: Vec<FitModule>,
    /// Drones + subsystems.
    pub other: Vec<FitModule>,
    /// 0–100 confidence that this is what they'll be flying.
    pub confidence: u8,
    pub confidence_label: String,
    /// Whether this fit is the pilot's own or inferred from their org.
    pub source: FitSource,
    /// How many losses of this ship we found in the window.
    pub sample_size: usize,
    /// The representative (most recent) killmail this fit is taken from.
    pub killmail_id: i64,
    pub killmail_time: String,
    pub total_value: f64,
}

/// The full prediction for a character.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FitPrediction {
    pub character_id: i64,
    /// Distinct ships from recent losses, most recent first.
    pub ships: Vec<PredictedShip>,
    /// How many loss killmails we actually reconstructed.
    pub losses_examined: usize,
    /// Cyno-alt assessment derived from the same losses.
    pub cyno: crate::intel::CynoAssessment,
    /// Activity / primetime profile derived from the same losses.
    pub activity: crate::intel::ActivityProfile,
    /// Set when there's nothing to show (e.g. no losses on record).
    #[serde(default)]
    pub note: Option<String>,
}

/// Aggregate loss fits (newest first) into per-ship predictions.
///
/// Ships keep the order in which they first appear (so the most recently lost
/// ship is first). For each ship, the most recent loss is the representative
/// fit, and confidence reflects how many times and how consistently the hull
/// was flown. `source` tags where these losses came from (the pilot vs. their
/// org).
pub fn aggregate(losses: &[LossFit], source: FitSource) -> Vec<PredictedShip> {
    let mut order: Vec<i64> = Vec::new();
    let mut groups: HashMap<i64, Vec<&LossFit>> = HashMap::new();
    for lf in losses {
        if !groups.contains_key(&lf.ship_type_id) {
            order.push(lf.ship_type_id);
        }
        groups.entry(lf.ship_type_id).or_default().push(lf);
    }

    let mut out = Vec::new();
    for ship in order {
        let group = &groups[&ship];
        let rep = group[0]; // newest loss of this ship

        let module_sets: Vec<Vec<i64>> = group
            .iter()
            .map(|lf| lf.modules.iter().map(|m| m.type_id).collect())
            .collect();
        let (confidence, label) = fit_confidence(&module_sets);

        let (mut high, mut mid, mut low, mut rig, mut other) =
            (Vec::new(), Vec::new(), Vec::new(), Vec::new(), Vec::new());
        for m in &rep.modules {
            match m.slot {
                Slot::High => high.push(m.clone()),
                Slot::Mid => mid.push(m.clone()),
                Slot::Low => low.push(m.clone()),
                Slot::Rig => rig.push(m.clone()),
                Slot::Subsystem | Slot::Drone => other.push(m.clone()),
                Slot::Other => {}
            }
        }

        // Skip module-less hulls (pods, empty/ganked ships): a fit with no
        // modules tells the pilot nothing.
        if high.is_empty()
            && mid.is_empty()
            && low.is_empty()
            && rig.is_empty()
            && other.is_empty()
        {
            continue;
        }

        out.push(PredictedShip {
            ship_type_id: ship,
            ship_name: None,
            high,
            mid,
            low,
            rig,
            other,
            confidence,
            confidence_label: label.to_string(),
            source,
            sample_size: group.len(),
            killmail_id: rep.killmail_id,
            killmail_time: rep.killmail_time.clone(),
            total_value: rep.total_value,
        });
    }
    out
}

/// Confidence (0–100) that a ship's representative fit is predictive, based on
/// how many losses we have and how similar their module sets are.
///
/// "High" requires repetition: ≥3 losses of the ship with strongly overlapping
/// modules (the plan's "même fit utilisé 3+ fois"). A single loss is "low".
pub fn fit_confidence(module_sets: &[Vec<i64>]) -> (u8, &'static str) {
    let n = module_sets.len();
    if n == 0 {
        return (0, "low");
    }
    if n == 1 {
        return (40, "low");
    }

    let sim = avg_pairwise_jaccard(module_sets);
    match (n, sim) {
        (n, s) if n >= 3 && s >= 0.7 => (90, "high"),
        (n, s) if n >= 3 && s >= 0.4 => (72, "medium"),
        (_, s) if s >= 0.6 => (68, "medium"),
        (_, s) if s >= 0.3 => (55, "medium"),
        _ => (45, "low"),
    }
}

/// Average Jaccard similarity over all unordered pairs of module-type sets.
fn avg_pairwise_jaccard(sets: &[Vec<i64>]) -> f64 {
    let sets: Vec<HashSet<i64>> = sets
        .iter()
        .map(|s| s.iter().copied().collect::<HashSet<i64>>())
        .collect();
    let mut total = 0.0;
    let mut pairs = 0u32;
    for i in 0..sets.len() {
        for j in (i + 1)..sets.len() {
            total += jaccard(&sets[i], &sets[j]);
            pairs += 1;
        }
    }
    if pairs == 0 {
        1.0
    } else {
        total / pairs as f64
    }
}

fn jaccard(a: &HashSet<i64>, b: &HashSet<i64>) -> f64 {
    if a.is_empty() && b.is_empty() {
        return 1.0;
    }
    let inter = a.intersection(b).count() as f64;
    let union = a.union(b).count() as f64;
    if union == 0.0 {
        0.0
    } else {
        inter / union
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slot_mapping() {
        assert_eq!(slot_of(11), Slot::Low);
        assert_eq!(slot_of(18), Slot::Low);
        assert_eq!(slot_of(19), Slot::Mid);
        assert_eq!(slot_of(27), Slot::High);
        assert_eq!(slot_of(34), Slot::High);
        assert_eq!(slot_of(92), Slot::Rig);
        assert_eq!(slot_of(125), Slot::Subsystem);
        assert_eq!(slot_of(87), Slot::Drone);
        assert_eq!(slot_of(5), Slot::Other); // cargo
        assert_eq!(slot_of(155), Slot::Other); // special bay
    }

    fn items() -> Vec<RawItem> {
        vec![
            // 8 high-slot launchers (8 separate lines, qty 1 each) → grouped to 8.
            RawItem { type_id: 100, flag: 27, quantity: 1 },
            RawItem { type_id: 100, flag: 28, quantity: 1 },
            RawItem { type_id: 100, flag: 27, quantity: 1 },
            // loaded missiles in a high slot (should stay, grouped separately)
            RawItem { type_id: 200, flag: 27, quantity: 1000 },
            // mid + low
            RawItem { type_id: 300, flag: 19, quantity: 1 },
            RawItem { type_id: 400, flag: 11, quantity: 1 },
            // rig
            RawItem { type_id: 500, flag: 92, quantity: 1 },
            // cargo junk → dropped
            RawItem { type_id: 999, flag: 5, quantity: 50 },
        ]
    }

    #[test]
    fn build_loss_fit_groups_and_filters() {
        let fit = build_loss_fit(1, "t".into(), 670, 1.0e6, &items());
        // 999 (cargo) excluded; 5 distinct fitted types remain.
        assert_eq!(fit.modules.len(), 5);

        let launcher = fit.modules.iter().find(|m| m.type_id == 100).unwrap();
        assert_eq!(launcher.quantity, 3); // three lines merged
        assert_eq!(launcher.slot, Slot::High);

        assert!(fit.modules.iter().all(|m| m.type_id != 999));
        // sorted: highs first.
        assert_eq!(fit.modules[0].slot, Slot::High);
    }

    #[test]
    fn aggregate_orders_by_recency_and_splits_slots() {
        let newest = build_loss_fit(20, "2026-06-02".into(), 670, 1.0, &items());
        let older_other_ship =
            build_loss_fit(10, "2026-05-01".into(), 671, 1.0, &items());
        let ships = aggregate(&[newest, older_other_ship], FitSource::OwnLoss);

        assert_eq!(ships.len(), 2);
        assert_eq!(ships[0].ship_type_id, 670); // most recent first
        assert_eq!(ships[0].source, FitSource::OwnLoss);
        assert_eq!(ships[1].ship_type_id, 671);

        let s = &ships[0];
        assert_eq!(s.high.len(), 2); // type 100 + type 200
        assert_eq!(s.mid.len(), 1);
        assert_eq!(s.low.len(), 1);
        assert_eq!(s.rig.len(), 1);
        assert_eq!(s.sample_size, 1);
        assert_eq!(s.killmail_id, 20);
    }

    #[test]
    fn aggregate_counts_repeated_ship_losses() {
        let a = build_loss_fit(30, "c".into(), 670, 1.0, &items());
        let b = build_loss_fit(20, "b".into(), 670, 1.0, &items());
        let c = build_loss_fit(10, "a".into(), 670, 1.0, &items());
        let ships = aggregate(&[a, b, c], FitSource::CorpDoctrine);
        assert_eq!(ships.len(), 1);
        assert_eq!(ships[0].source, FitSource::CorpDoctrine);
        assert_eq!(ships[0].sample_size, 3);
        assert_eq!(ships[0].killmail_id, 30); // newest is representative
    }

    #[test]
    fn confidence_rewards_consistent_repetition() {
        // Three identical fits → high.
        let same = vec![vec![1, 2, 3, 4], vec![1, 2, 3, 4], vec![1, 2, 3, 4]];
        let (score, label) = fit_confidence(&same);
        assert_eq!(label, "high");
        assert!(score >= 85);

        // Single loss → low.
        let (s1, l1) = fit_confidence(&[vec![1, 2, 3]]);
        assert_eq!(l1, "low");
        assert_eq!(s1, 40);

        // Two wildly different fits → low-ish, never "high".
        let (s2, l2) = fit_confidence(&[vec![1, 2, 3], vec![9, 8, 7]]);
        assert_ne!(l2, "high");
        assert!(s2 < 90);

        // No data.
        assert_eq!(fit_confidence(&[]), (0, "low"));
    }
}
