//! Pirate's Big Helper — intel engine.
//!
//! Pure, transport-agnostic core that turns a pasted EVE local-chat blob into a
//! sorted, threat-scored list of pilots. The Tauri shell depends on this crate
//! and exposes [`Engine`] over IPC; everything here is unit-testable without a
//! GUI and without the network (see the `MockHttp` test harness).

pub mod cache;
pub mod engine;
pub mod error;
pub mod esi;
pub mod fit;
pub mod http;
pub mod intel;
pub mod model;
pub mod parse;
pub mod postmortem;
pub mod threat;
pub mod zkill;

#[cfg(test)]
mod testutil;

pub use engine::{Engine, DEFAULT_TTL_SECS};
pub use error::{Error, Result};
pub use fit::{FitModule, FitPrediction, FitSource, PredictedShip, Slot};
pub use intel::{ActivityProfile, CoFlyer, CynoAssessment, NetworkAnalysis};
pub use model::{KillStats, PilotIntel, ShipUsage, ThreatLevel, WatchTag};
pub use postmortem::{GangClass, PmAttacker, PmCount, PmFit, PostMortem};

/// Default User-Agent sent to ESI and zKillboard. zKill requires a descriptive
/// UA with contact info; ESI strongly recommends one.
pub const DEFAULT_USER_AGENT: &str =
    "PiratesBigHelper/0.1 (+https://github.com/pbh; contact: lacausecrypto@gmail.com)";
