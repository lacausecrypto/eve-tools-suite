//! Loss-derived intel that reuses the same reconstructed killmails as fit
//! prediction: **cyno detection** and an **activity / primetime profile**.
//!
//! Both are pure functions over `&[LossFit]`, so they're free to compute once
//! the engine has fetched a pilot's losses for [`crate::engine::Engine::predict_fit`].

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::fit::LossFit;

/// Cynosural Field Generator type ids (standard / covert / industrial).
const CYNO_STANDARD: i64 = 21096;
const CYNO_COVERT: i64 = 28646;
const CYNO_INDUSTRIAL: i64 = 52694;

/// A loss is "cheap" (throwaway) below this ISK value.
const CHEAP_ISK: f64 = 20_000_000.0;
/// Need at least this many timed losses before guessing a timezone.
const MIN_TZ_SAMPLES: usize = 4;

/// Verdict on whether a pilot looks like a cyno alt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CynoAssessment {
    pub suspect: bool,
    /// 0–100 suspicion score.
    pub score: u8,
    /// Human-readable evidence, shown in the UI.
    pub reasons: Vec<String>,
}

impl CynoAssessment {
    pub fn none() -> Self {
        CynoAssessment {
            suspect: false,
            score: 0,
            reasons: Vec::new(),
        }
    }
}

/// Detect cyno-alt behaviour from a pilot's reconstructed losses.
///
/// Strongest signal is a fitted Cynosural Field Generator (we only ever see one
/// because it's on a killmail = the pilot died with it). A weaker signal is the
/// classic "dies over and over in the same cheap throwaway hull" pattern.
pub fn assess_cyno(losses: &[LossFit]) -> CynoAssessment {
    let mut reasons = Vec::new();

    let has_covert = has_module(losses, CYNO_COVERT);
    let has_standard = has_module(losses, CYNO_STANDARD);
    let has_industrial = has_module(losses, CYNO_INDUSTRIAL);
    let has_cyno = has_covert || has_standard || has_industrial;

    if has_covert {
        reasons.push("fitted a Covert Cynosural Field Generator — likely a hunter / hot-drop cyno".into());
    }
    if has_standard {
        reasons.push("fitted a Cynosural Field Generator — cyno alt".into());
    }
    if has_industrial {
        reasons.push("fitted an Industrial Cynosural Field Generator".into());
    }

    // Cheap-throwaway pattern: many low-value losses concentrated in 1–2 hulls.
    let cheap: Vec<&LossFit> = losses
        .iter()
        .filter(|l| l.total_value > 0.0 && l.total_value < CHEAP_ISK)
        .collect();
    let distinct_cheap: std::collections::HashSet<i64> =
        cheap.iter().map(|l| l.ship_type_id).collect();
    let cheap_pattern = cheap.len() >= 3 && distinct_cheap.len() <= 2;
    if cheap_pattern {
        reasons.push(format!(
            "repeatedly dies in cheap throwaway ships ({} losses under {}M ISK)",
            cheap.len(),
            (CHEAP_ISK / 1_000_000.0) as i64
        ));
    }

    let score: u8 = if has_cyno && cheap_pattern {
        96
    } else if has_covert {
        92
    } else if has_cyno {
        88
    } else if cheap_pattern {
        55
    } else {
        0
    };

    CynoAssessment {
        suspect: score >= 50,
        score,
        reasons,
    }
}

fn has_module(losses: &[LossFit], type_id: i64) -> bool {
    losses
        .iter()
        .any(|l| l.modules.iter().any(|m| m.type_id == type_id))
}

/// When a pilot tends to be in space, derived from recent loss timestamps (UTC).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ActivityProfile {
    /// Loss count per UTC hour, index 0–23.
    pub hours: Vec<u32>,
    /// Number of losses with a parseable timestamp.
    pub samples: usize,
    /// The busiest UTC hours (their "primetime").
    pub peak_hours: Vec<u8>,
    /// Coarse timezone guess, e.g. "EU TZ". `None` when too few samples.
    pub tz_guess: Option<String>,
}

impl ActivityProfile {
    pub fn empty() -> Self {
        ActivityProfile {
            hours: vec![0; 24],
            samples: 0,
            peak_hours: Vec::new(),
            tz_guess: None,
        }
    }
}

/// Build a 24-hour UTC activity histogram from loss timestamps.
pub fn activity_profile(losses: &[LossFit]) -> ActivityProfile {
    let mut hours = vec![0u32; 24];
    let mut samples = 0usize;
    for l in losses {
        if let Some(h) = parse_utc_hour(&l.killmail_time) {
            hours[h as usize] += 1;
            samples += 1;
        }
    }

    if samples == 0 {
        return ActivityProfile::empty();
    }

    let max = *hours.iter().max().unwrap_or(&0);
    let threshold = ((max as f64) * 0.5).ceil() as u32;
    let threshold = threshold.max(1);
    let peak_hours: Vec<u8> = (0..24u8)
        .filter(|&h| hours[h as usize] >= threshold)
        .collect();

    let tz_guess = if samples >= MIN_TZ_SAMPLES {
        Some(tz_label(circular_mean_hour(&hours)))
    } else {
        None
    };

    ActivityProfile {
        hours,
        samples,
        peak_hours,
        tz_guess,
    }
}

/// Parse the UTC hour out of an ESI timestamp like `2026-06-02T17:00:00Z`.
fn parse_utc_hour(ts: &str) -> Option<u8> {
    let time = ts.split('T').nth(1)?;
    let hh = time.get(0..2)?;
    hh.parse::<u8>().ok().filter(|&h| h < 24)
}

/// Circular (wrap-aware) mean of the activity hours, weighted by count.
fn circular_mean_hour(hours: &[u32]) -> f64 {
    let (mut sx, mut sy) = (0.0f64, 0.0f64);
    for (h, &count) in hours.iter().enumerate() {
        let angle = (h as f64) / 24.0 * std::f64::consts::TAU;
        sx += (count as f64) * angle.cos();
        sy += (count as f64) * angle.sin();
    }
    let mut mean = sy.atan2(sx) / std::f64::consts::TAU * 24.0;
    if mean < 0.0 {
        mean += 24.0;
    }
    mean
}

/// Map a peak UTC hour to a coarse EVE timezone label.
fn tz_label(hour: f64) -> String {
    let h = hour as i64 % 24;
    match h {
        16..=21 => "EU TZ",
        22 | 23 | 0..=4 => "US TZ",
        5..=10 => "AU / late US TZ",
        _ => "RU / early EU TZ", // 11–15
    }
    .to_string()
}

/// A pilot who frequently appears on the same killmails — i.e. flies in the
/// same gang.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CoFlyer {
    pub character_id: i64,
    #[serde(default)]
    pub name: Option<String>,
    /// Number of the subject's recent kills this pilot also appeared on.
    pub kills_together: usize,
}

/// Gang network derived from a pilot's recent kills.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NetworkAnalysis {
    pub character_id: i64,
    pub kills_examined: usize,
    pub coflyers: Vec<CoFlyer>,
}

/// Need to co-appear on at least this many of the subject's kills to count as a
/// regular wingman (filters out one-off blueballs / random third parties).
const MIN_TOGETHER: usize = 2;

/// Rank a pilot's most frequent co-attackers across their recent killmails.
///
/// `kill_attackers` is one entry per kill, listing the attacker character ids on
/// that kill. The subject (`self_id`) is excluded, and each pilot is counted at
/// most once per kill.
pub fn top_coflyers(kill_attackers: &[Vec<i64>], self_id: i64, top_n: usize) -> Vec<CoFlyer> {
    let mut counts: HashMap<i64, usize> = HashMap::new();
    for attackers in kill_attackers {
        let unique: HashSet<i64> = attackers
            .iter()
            .copied()
            .filter(|&id| id != self_id)
            .collect();
        for id in unique {
            *counts.entry(id).or_insert(0) += 1;
        }
    }

    let mut out: Vec<CoFlyer> = counts
        .into_iter()
        .filter(|&(_, c)| c >= MIN_TOGETHER)
        .map(|(character_id, kills_together)| CoFlyer {
            character_id,
            name: None,
            kills_together,
        })
        .collect();
    out.sort_by(|a, b| {
        b.kills_together
            .cmp(&a.kills_together)
            .then(a.character_id.cmp(&b.character_id))
    });
    out.truncate(top_n);
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fit::{FitModule, Slot};

    fn loss(id: i64, time: &str, ship: i64, value: f64, module_ids: &[i64]) -> LossFit {
        LossFit {
            killmail_id: id,
            killmail_time: time.into(),
            ship_type_id: ship,
            total_value: value,
            modules: module_ids
                .iter()
                .map(|&t| FitModule {
                    type_id: t,
                    name: None,
                    quantity: 1,
                    slot: Slot::High,
                })
                .collect(),
        }
    }

    #[test]
    fn covert_cyno_module_flags_suspect() {
        let losses = vec![loss(1, "2026-01-01T18:00:00Z", 11957, 2.0e8, &[CYNO_COVERT, 100])];
        let a = assess_cyno(&losses);
        assert!(a.suspect);
        assert!(a.score >= 90);
        assert!(a.reasons.iter().any(|r| r.contains("Covert")));
    }

    #[test]
    fn cheap_repeated_deaths_flag_pattern() {
        // Three sub-20M losses in the same hull, no cyno module.
        let losses = vec![
            loss(3, "2026-01-03T18:00:00Z", 670, 5.0e6, &[100]),
            loss(2, "2026-01-02T18:00:00Z", 670, 4.0e6, &[100]),
            loss(1, "2026-01-01T18:00:00Z", 670, 6.0e6, &[100]),
        ];
        let a = assess_cyno(&losses);
        assert!(a.suspect);
        assert_eq!(a.score, 55);
        assert!(a.reasons.iter().any(|r| r.contains("throwaway")));
    }

    #[test]
    fn normal_pvp_losses_are_not_cyno() {
        let losses = vec![
            loss(2, "2026-01-02T18:00:00Z", 587, 8.0e7, &[100, 200]),
            loss(1, "2026-01-01T18:00:00Z", 588, 9.0e7, &[100, 300]),
        ];
        let a = assess_cyno(&losses);
        assert!(!a.suspect);
        assert_eq!(a.score, 0);
        assert!(a.reasons.is_empty());
    }

    #[test]
    fn cyno_plus_cheap_pattern_scores_highest() {
        let losses = vec![
            loss(3, "2026-01-03T18:00:00Z", 670, 5.0e6, &[CYNO_STANDARD]),
            loss(2, "2026-01-02T18:00:00Z", 670, 4.0e6, &[100]),
            loss(1, "2026-01-01T18:00:00Z", 670, 6.0e6, &[100]),
        ];
        assert_eq!(assess_cyno(&losses).score, 96);
    }

    #[test]
    fn parse_hour_works() {
        assert_eq!(parse_utc_hour("2026-06-02T17:00:00Z"), Some(17));
        assert_eq!(parse_utc_hour("2026-06-02T00:30:00Z"), Some(0));
        assert_eq!(parse_utc_hour("garbage"), None);
    }

    #[test]
    fn activity_histogram_and_eu_primetime() {
        // Six losses clustered at 18–20 UTC → EU TZ, peak around there.
        let times = [
            "2026-01-01T18:00:00Z",
            "2026-01-02T19:00:00Z",
            "2026-01-03T18:00:00Z",
            "2026-01-04T20:00:00Z",
            "2026-01-05T19:00:00Z",
            "2026-01-06T18:00:00Z",
        ];
        let losses: Vec<LossFit> = times
            .iter()
            .enumerate()
            .map(|(i, t)| loss(i as i64, t, 587, 5.0e7, &[100]))
            .collect();

        let p = activity_profile(&losses);
        assert_eq!(p.samples, 6);
        assert_eq!(p.hours[18], 3);
        assert_eq!(p.hours[19], 2);
        assert!(p.peak_hours.contains(&18));
        assert_eq!(p.tz_guess.as_deref(), Some("EU TZ"));
    }

    #[test]
    fn too_few_samples_no_tz_guess() {
        let losses = vec![loss(1, "2026-01-01T03:00:00Z", 587, 5.0e7, &[100])];
        let p = activity_profile(&losses);
        assert_eq!(p.samples, 1);
        assert!(p.tz_guess.is_none());
    }

    #[test]
    fn empty_losses_empty_profile() {
        let p = activity_profile(&[]);
        assert_eq!(p.samples, 0);
        assert_eq!(p.hours.len(), 24);
        assert!(p.peak_hours.is_empty());
    }

    #[test]
    fn coflyers_rank_frequent_wingmen_excluding_self() {
        let self_id = 1;
        // Kills: 10 appears on 3, 20 on 2, 30 on 1 (filtered), self ignored.
        let kills = vec![
            vec![1, 10, 20, 30],
            vec![1, 10, 20],
            vec![1, 10],
        ];
        let top = top_coflyers(&kills, self_id, 10);
        assert_eq!(top.len(), 2); // 30 filtered (only once)
        assert_eq!(top[0].character_id, 10);
        assert_eq!(top[0].kills_together, 3);
        assert_eq!(top[1].character_id, 20);
        assert_eq!(top[1].kills_together, 2);
        assert!(top.iter().all(|c| c.character_id != self_id));
    }

    #[test]
    fn coflyers_dedupe_within_a_single_kill() {
        // Same wingman listed twice on one kill counts once for that kill.
        let kills = vec![vec![1, 10, 10], vec![1, 10]];
        let top = top_coflyers(&kills, 1, 10);
        assert_eq!(top[0].kills_together, 2);
    }

    #[test]
    fn coflyers_respects_top_n() {
        let kills = vec![
            vec![10, 20, 30, 40],
            vec![10, 20, 30, 40],
        ];
        assert_eq!(top_coflyers(&kills, 1, 2).len(), 2);
    }
}
