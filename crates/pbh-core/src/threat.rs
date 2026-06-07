//! Threat scoring (v2).
//!
//! A transparent, explainable model over killboard stats, security status,
//! **hull class**, **activity recency**, and **typical gang size**.
//!
//! Base score (0–100) is a weighted blend, then scaled by recency and gang
//! multipliers:
//!
//! | Component   | Weight | Signal                                            |
//! |-------------|--------|---------------------------------------------------|
//! | danger      | 0.26   | zKill "danger" %: how often they're on the kill   |
//! | ship class  | 0.22   | flies capitals / T3 / recons → scarier            |
//! | volume      | 0.16   | log-scaled total kills: an active, practised pilot|
//! | kill/death  | 0.10   | capped K/D: raw effectiveness                      |
//! | sec status  | 0.10   | negative sec → outlaw / habitual aggressor         |
//! | solo        | 0.16   | log-scaled solo kills: danger to a *solo* target   |
//!
//! `final = base * recency_mult * gang_mult`, clamped 0–100. Recency strongly
//! dampens long-stale killboards (a once-deadly pilot inactive for years isn't
//! the threat their all-time stats suggest); gang size nudges solo-credibility.

use crate::model::KillStats;
use crate::model::ThreatLevel;

const W_DANGER: f64 = 0.26;
const W_SHIP_CLASS: f64 = 0.22;
const W_VOLUME: f64 = 0.16;
const W_KD: f64 = 0.10;
const W_SEC: f64 = 0.10;
const W_SOLO: f64 = 0.16;

const VOLUME_SATURATION: f64 = 500.0;
const KD_SATURATION: f64 = 10.0;
const SOLO_SATURATION: f64 = 100.0;

/// A ship group must have at least this much activity to count toward hull
/// class — guards against a single fluke capital loss reading as "capital pilot".
const MIN_GROUP_ACTIVITY: i64 = 2;

const SECS_PER_MONTH: f64 = 30.44 * 86_400.0;

/// Assess a pilot, returning a bucket and a 0–100 score. `now` is unix seconds
/// (injected for deterministic recency).
pub fn assess(security_status: Option<f64>, stats: &KillStats, now: i64) -> (ThreatLevel, u32) {
    if stats.ships_destroyed == 0 && stats.ships_lost == 0 {
        return (ThreatLevel::Harmless, 0);
    }

    let danger = stats.danger_ratio.clamp(0, 100) as f64;
    let ship_class = ship_class_component(stats);
    let volume = log_norm(stats.ships_destroyed as f64, VOLUME_SATURATION);
    let kd = (stats.kd_ratio() / KD_SATURATION).clamp(0.0, 1.0) * 100.0;
    let sec = sec_component(security_status);
    let solo = log_norm(stats.solo_kills as f64, SOLO_SATURATION);

    let base = W_DANGER * danger
        + W_SHIP_CLASS * ship_class
        + W_VOLUME * volume
        + W_KD * kd
        + W_SEC * sec
        + W_SOLO * solo;

    let scaled = base * recency_mult(stats.last_kill_at, now) * gang_mult(stats.avg_gang_size);
    let score = scaled.round().clamp(0.0, 100.0) as u32;
    (bucket(score), score)
}

/// A short label for a notably dangerous hull class, or `None` if unremarkable.
pub fn ship_class_label(stats: &KillStats) -> Option<String> {
    match top_tier(stats) {
        4 => Some("capitals / blops".to_string()),
        3 => Some("T3 / recon / elite".to_string()),
        _ => None,
    }
}

/// Highest hull-class tier the pilot meaningfully flies (0–4).
fn top_tier(stats: &KillStats) -> u8 {
    stats
        .ship_groups
        .iter()
        .filter(|g| g.count >= MIN_GROUP_ACTIVITY)
        .map(|g| group_tier(g.group_id))
        .max()
        .unwrap_or(0)
}

fn ship_class_component(stats: &KillStats) -> f64 {
    tier_weight(top_tier(stats))
}

fn tier_weight(tier: u8) -> f64 {
    match tier {
        4 => 100.0,
        3 => 80.0,
        2 => 55.0,
        1 => 35.0,
        _ => 8.0,
    }
}

/// Map an EVE inventory ship group id to a threat tier (0 = noncombat, 4 = capital/blops).
fn group_tier(group_id: i64) -> u8 {
    match group_id {
        // Capitals, supers, titans, black ops, capital industrial.
        30 | 659 | 547 | 485 | 1538 | 4594 | 883 | 898 => 4,
        // Strategic / tactical destroyers, marauders, recons, command, HAC, HIC.
        963 | 1305 | 900 | 833 | 906 | 540 | 358 | 894 => 3,
        // Assault frigs, interceptors, dictors, command destroyers, EAS, bombers, BCs.
        324 | 831 | 541 | 1534 | 893 | 834 | 830 | 419 | 1201 => 2,
        // Noncombat: pods, shuttles, haulers, miners, freighters, orca.
        29 | 31 | 28 | 380 | 1202 | 463 | 543 | 902 | 513 | 941 => 0,
        // Everything else (generic frigates/cruisers/battleships/destroyers).
        _ => 1,
    }
}

/// Recent activity keeps the score; long-stale killboards are dampened.
fn recency_mult(last_kill_at: Option<i64>, now: i64) -> f64 {
    match last_kill_at {
        None => 0.85,
        Some(t) => {
            let months = (now - t) as f64 / SECS_PER_MONTH;
            if months <= 1.0 {
                1.0
            } else if months <= 6.0 {
                0.92
            } else if months <= 24.0 {
                0.70
            } else {
                0.45
            }
        }
    }
}

/// Small nudge: solo/small-gang pilots are more credible *solo* threats; pure
/// blob pilots slightly less likely to commit solo (but still have friends).
fn gang_mult(avg_gang_size: f64) -> f64 {
    if avg_gang_size <= 0.0 {
        1.0
    } else if avg_gang_size <= 3.0 {
        1.08
    } else if avg_gang_size <= 10.0 {
        1.0
    } else {
        0.92
    }
}

fn log_norm(value: f64, saturation: f64) -> f64 {
    if value <= 0.0 {
        return 0.0;
    }
    let ratio = (1.0 + value).ln() / (1.0 + saturation).ln();
    ratio.clamp(0.0, 1.0) * 100.0
}

fn sec_component(security_status: Option<f64>) -> f64 {
    match security_status {
        Some(sec) if sec < 0.0 => ((-sec) / 5.0).clamp(0.0, 1.0) * 100.0,
        _ => 0.0,
    }
}

fn bucket(score: u32) -> ThreatLevel {
    match score {
        0..=19 => ThreatLevel::Harmless,
        20..=44 => ThreatLevel::Moderate,
        45..=69 => ThreatLevel::Dangerous,
        _ => ThreatLevel::Deadly,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::ShipGroupActivity;

    const NOW: i64 = 1_780_000_000; // ~2026

    /// Builder with recent activity by default (so recency doesn't dampen).
    fn ks() -> KillStats {
        KillStats {
            last_kill_at: Some(NOW),
            ..Default::default()
        }
    }

    fn groups(pairs: &[(i64, i64)]) -> Vec<ShipGroupActivity> {
        pairs
            .iter()
            .map(|&(group_id, count)| ShipGroupActivity { group_id, count })
            .collect()
    }

    #[test]
    fn no_history_is_harmless() {
        let (level, score) = assess(Some(-10.0), &KillStats::default(), NOW);
        assert_eq!(level, ThreatLevel::Harmless);
        assert_eq!(score, 0);
    }

    #[test]
    fn industrialist_many_losses_no_kills_is_low() {
        let s = KillStats {
            ships_lost: 50,
            ship_groups: groups(&[(28, 50)]), // Industrial
            ..ks()
        };
        let (level, _) = assess(Some(0.5), &s, NOW);
        assert_eq!(level, ThreatLevel::Harmless);
    }

    #[test]
    fn prolific_capital_outlaw_is_deadly() {
        let s = KillStats {
            ships_destroyed: 2000,
            ships_lost: 100,
            solo_kills: 300,
            danger_ratio: 90,
            ship_groups: groups(&[(27, 1000), (30, 40)]), // Battleship + Titan
            ..ks()
        };
        let (level, score) = assess(Some(-9.8), &s, NOW);
        assert_eq!(level, ThreatLevel::Deadly);
        assert!(score >= 70, "score was {score}");
    }

    #[test]
    fn ship_class_raises_threat() {
        // Same stats, but one flies a Strategic Cruiser (T3C) vs a basic frigate.
        let base = KillStats {
            ships_destroyed: 60,
            ships_lost: 30,
            danger_ratio: 50,
            solo_kills: 10,
            ..ks()
        };
        let frig = KillStats {
            ship_groups: groups(&[(25, 60)]),
            ..base.clone()
        };
        let t3c = KillStats {
            ship_groups: groups(&[(963, 60)]),
            ..base
        };
        assert!(assess(Some(-1.0), &t3c, NOW).1 > assess(Some(-1.0), &frig, NOW).1);
    }

    #[test]
    fn recency_dampens_stale_killboards() {
        let s = KillStats {
            ships_destroyed: 2000,
            ships_lost: 100,
            solo_kills: 300,
            danger_ratio: 90,
            ship_groups: groups(&[(30, 40)]),
            ..ks()
        };
        let recent = assess(Some(-9.0), &s, NOW).1;
        let stale = assess(
            Some(-9.0),
            &KillStats {
                last_kill_at: Some(NOW - (3 * 365 * 86_400)),
                ..s
            },
            NOW,
        )
        .1;
        assert!(stale < recent, "stale {stale} should be < recent {recent}");
    }

    #[test]
    fn ship_class_label_for_capitals_and_t3() {
        assert_eq!(
            ship_class_label(&KillStats {
                ship_groups: groups(&[(30, 10)]),
                ..ks()
            })
            .as_deref(),
            Some("capitals / blops")
        );
        assert_eq!(
            ship_class_label(&KillStats {
                ship_groups: groups(&[(963, 10)]),
                ..ks()
            })
            .as_deref(),
            Some("T3 / recon / elite")
        );
        // A plain cruiser pilot gets no special label.
        assert_eq!(
            ship_class_label(&KillStats {
                ship_groups: groups(&[(26, 10)]),
                ..ks()
            }),
            None
        );
    }

    #[test]
    fn single_fluke_capital_does_not_count() {
        // Only 1 titan loss → below MIN_GROUP_ACTIVITY → not a capital pilot.
        let s = KillStats {
            ship_groups: groups(&[(30, 1), (25, 50)]),
            ..ks()
        };
        assert_eq!(ship_class_label(&s), None);
    }

    #[test]
    fn score_is_monotonic_in_kill_volume() {
        let mk = |d| KillStats {
            ships_destroyed: d,
            ships_lost: 10,
            danger_ratio: 50,
            solo_kills: 2,
            ship_groups: groups(&[(26, d)]),
            ..ks()
        };
        let low = assess(Some(-1.0), &mk(10), NOW).1;
        let mid = assess(Some(-1.0), &mk(100), NOW).1;
        let high = assess(Some(-1.0), &mk(1000), NOW).1;
        assert!(low < mid && mid < high, "{low} {mid} {high}");
    }

    #[test]
    fn score_is_bounded() {
        let s = KillStats {
            ships_destroyed: 100_000,
            ships_lost: 1,
            solo_kills: 100_000,
            danger_ratio: 100,
            avg_gang_size: 1.0,
            ship_groups: groups(&[(30, 9999)]),
            ..ks()
        };
        assert!(assess(Some(-10.0), &s, NOW).1 <= 100);
    }

    #[test]
    fn negative_sec_raises_score_vs_positive() {
        let s = KillStats {
            ships_destroyed: 50,
            ships_lost: 20,
            danger_ratio: 50,
            solo_kills: 5,
            ship_groups: groups(&[(26, 50)]),
            ..ks()
        };
        let outlaw = assess(Some(-8.0), &s, NOW).1;
        let carebear = assess(Some(2.0), &s, NOW).1;
        assert!(outlaw > carebear);
    }
}
