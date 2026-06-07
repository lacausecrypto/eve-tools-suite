//! Live end-to-end test against the real ESI + zKillboard APIs.
//!
//! Network-dependent and therefore opt-in. Run with:
//!
//! ```sh
//! cargo test -p pbh-core --features live-tests -- --ignored --nocapture
//! ```

#![cfg(feature = "live-tests")]

use pbh_core::engine::{DEFAULT_FIT_KILLMAILS, DEFAULT_NETWORK_KILLMAILS};
use pbh_core::{Engine, ThreatLevel, DEFAULT_USER_AGENT};

#[tokio::test]
#[ignore = "hits the live ESI/zKill APIs"]
async fn resolves_real_pilots() {
    let engine = Engine::production(DEFAULT_USER_AGENT);

    // A known character (CCP Falcon) plus a deliberately bogus name.
    let pasted = "CCP Falcon\nZzzz Not A Real Pilot Name Xyzzy";
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let pilots = engine.resolve_pasted(pasted, now).await;

    assert_eq!(pilots.len(), 2, "both names should yield a row");

    let falcon = pilots
        .iter()
        .find(|p| p.name == "CCP Falcon")
        .expect("CCP Falcon should resolve");
    assert_eq!(falcon.character_id, Some(92532650));
    assert!(falcon.corporation_id.is_some());
    assert!(falcon.corporation_name.is_some(), "corp name resolved");
    assert!(falcon.security_status.is_some());
    assert!(falcon.stats.is_some(), "zKill stats fetched");
    assert!(falcon.threat_score.is_some());

    let bogus = pilots
        .iter()
        .find(|p| p.name.starts_with("Zzzz"))
        .expect("bogus row present");
    assert_eq!(bogus.character_id, None);
    assert_eq!(bogus.threat, ThreatLevel::Unknown);

    println!(
        "LIVE: {} → id={:?} corp={:?} sec={:?} score={:?} top_ships={}",
        falcon.name,
        falcon.character_id,
        falcon.corporation_name,
        falcon.security_status,
        falcon.threat_score,
        falcon.stats.as_ref().map(|s| s.top_ships.len()).unwrap_or(0),
    );
}

#[tokio::test]
#[ignore = "hits the live ESI/zKill APIs"]
async fn predicts_a_real_fit() {
    let engine = Engine::production(DEFAULT_USER_AGENT);

    // Killah Bee — a prolific PvPer with plenty of losses on record.
    // corp/alliance None here so the test exercises the own-loss path only.
    let pred = engine
        .predict_fit(669000721, None, None, DEFAULT_FIT_KILLMAILS)
        .await;

    assert!(pred.losses_examined > 0, "expected reconstructed losses");
    assert!(!pred.ships.is_empty(), "expected at least one predicted ship");

    let top = &pred.ships[0];
    assert!(top.ship_name.is_some(), "ship name resolved");
    // A real fit should have populated at least one slot category.
    let total_modules =
        top.high.len() + top.mid.len() + top.low.len() + top.rig.len() + top.other.len();
    assert!(total_modules > 0, "fit has modules");

    println!(
        "LIVE FIT: {} (conf {} / {}, {} losses of this hull) — {}H {}M {}L {}R, examined {}",
        top.ship_name.as_deref().unwrap_or("?"),
        top.confidence,
        top.confidence_label,
        top.sample_size,
        top.high.len(),
        top.mid.len(),
        top.low.len(),
        top.rig.len(),
        pred.losses_examined,
    );
    for m in top.high.iter().chain(&top.mid).chain(&top.low).chain(&top.rig) {
        println!("  - {}x {}", m.quantity, m.name.as_deref().unwrap_or("?"));
    }

    // Cyno + activity intel come from the same losses.
    assert!(pred.activity.samples > 0, "activity profile built");
    println!(
        "LIVE INTEL: cyno suspect={} score={} reasons={:?}",
        pred.cyno.suspect, pred.cyno.score, pred.cyno.reasons
    );
    println!(
        "LIVE INTEL: activity samples={} peak_hours(UTC)={:?} tz={:?}",
        pred.activity.samples, pred.activity.peak_hours, pred.activity.tz_guess
    );
}

#[tokio::test]
#[ignore = "hits the live ESI/zKill APIs"]
async fn doctrine_fallback_surfaces_corp_hulls() {
    use pbh_core::FitSource;
    let engine = Engine::production(DEFAULT_USER_AGENT);

    // Killah Bee with their real corp + alliance (ids fetched via ESI affiliation).
    let pred = engine
        .predict_fit(669000721, Some(739403251), Some(1727758877), 25)
        .await;

    assert!(!pred.ships.is_empty(), "expected own + doctrine ships");

    let doctrine: Vec<_> = pred
        .ships
        .iter()
        .filter(|s| s.source != FitSource::OwnLoss)
        .collect();

    println!(
        "LIVE DOCTRINE: {} ships total, {} from doctrine",
        pred.ships.len(),
        doctrine.len()
    );
    for s in &pred.ships {
        println!(
            "  [{:?}] {} — conf {}% ({} samples)",
            s.source,
            s.ship_name.as_deref().unwrap_or("?"),
            s.confidence,
            s.sample_size
        );
    }
    // A pilot's own hulls must never also appear as doctrine.
    let own: std::collections::HashSet<_> = pred
        .ships
        .iter()
        .filter(|s| s.source == FitSource::OwnLoss)
        .map(|s| s.ship_type_id)
        .collect();
    assert!(
        doctrine.iter().all(|s| !own.contains(&s.ship_type_id)),
        "doctrine hulls must not duplicate own hulls"
    );
}

#[tokio::test]
#[ignore = "hits the live ESI/zKill APIs"]
async fn timing_full_local_burst() {
    let engine = Engine::production(DEFAULT_USER_AGENT);
    let pasted = "chribba\nThe Mittani\nVily\nprogodlegend\nElise Randolph\nSort Dragon\nKillah Bee\nSuitonia\nHateLesS\nSard Caid\nPandoralica\ngigX\nMike Azariah\nRixx Javix";
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let start = std::time::Instant::now();
    let pilots = engine.resolve_pasted(pasted, now).await;
    let elapsed = start.elapsed();

    println!(
        "LIVE TIMING: {} pilots resolved in {} ms",
        pilots.len(),
        elapsed.as_millis()
    );
    assert_eq!(pilots.len(), 14);
    // Was ~13s with the old 1 req/s gate; burst should bring a cold run well under 4s.
    assert!(elapsed.as_secs() < 5, "took {elapsed:?}");
}

#[tokio::test]
#[ignore = "hits the live ESI/zKill APIs"]
async fn network_finds_real_wingmen() {
    let engine = Engine::production(DEFAULT_USER_AGENT);
    let net = engine
        .analyze_network(669000721, DEFAULT_NETWORK_KILLMAILS)
        .await;

    println!(
        "LIVE NETWORK: kills_examined={} coflyers={}",
        net.kills_examined,
        net.coflyers.len()
    );
    for c in net.coflyers.iter().take(6) {
        println!(
            "  - {} ×{}",
            c.name.as_deref().unwrap_or("?"),
            c.kills_together
        );
    }
    assert!(net.kills_examined > 0, "examined some kills");
}
