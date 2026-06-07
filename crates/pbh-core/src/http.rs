//! HTTP abstraction.
//!
//! All network access goes through the [`HttpClient`] trait so the ESI / zKill
//! clients and the engine can be exercised in unit tests with canned responses
//! and zero network access. [`ReqwestClient`] is the production implementation.

use std::collections::HashMap;
use std::time::Duration;

use async_trait::async_trait;
use serde_json::Value;

use crate::error::{Error, Result};

/// Minimal async HTTP surface the rest of the crate depends on.
#[async_trait]
pub trait HttpClient: Send + Sync {
    /// GET `url`, returning the decoded JSON body.
    async fn get_json(&self, url: &str) -> Result<Value>;

    /// POST `body` as JSON to `url`, returning the decoded JSON body.
    async fn post_json(&self, url: &str, body: &Value) -> Result<Value>;
}

/// Lets a single shared, rate-limited client be handed to several API wrappers
/// (ESI and zKill) while keeping one set of host gates.
#[async_trait]
impl<T: HttpClient + ?Sized> HttpClient for std::sync::Arc<T> {
    async fn get_json(&self, url: &str) -> Result<Value> {
        (**self).get_json(url).await
    }
    async fn post_json(&self, url: &str, body: &Value) -> Result<Value> {
        (**self).post_json(url, body).await
    }
}

/// Politeness gate: serialise requests to a host and keep a minimum spacing
/// between them. zKillboard explicitly asks for ~1 request/second and a
/// descriptive `User-Agent`; ESI is far more permissive but we still avoid
/// hammering it.
struct HostGate {
    /// Sustained spacing between requests (1 / sustained-rate).
    interval: Duration,
    /// How many requests may fire immediately after an idle period.
    burst: u32,
    /// Monotonic schedule: the time the next request slot opens. `None` until
    /// the first request.
    next: tokio::sync::Mutex<Option<tokio::time::Instant>>,
}

impl HostGate {
    /// A token-bucket gate: up to `burst` requests fire instantly, then the
    /// rate settles to one per `interval`. This keeps a typical local snappy
    /// while staying polite on sustained load.
    fn new(interval: Duration, burst: u32) -> Self {
        HostGate {
            interval,
            burst,
            next: tokio::sync::Mutex::new(None),
        }
    }

    /// Block until this request's scheduled slot, reserving it under the lock so
    /// concurrent callers serialize correctly.
    async fn acquire(&self) {
        if self.interval.is_zero() {
            return;
        }
        let wait = {
            let mut next = self.next.lock().await;
            let now = tokio::time::Instant::now();
            // Allow up to `burst` slots of credit to accumulate while idle.
            // `checked_sub` guards the (test-only) case of `now` near the clock
            // origin where the window would underflow.
            let floor = now.checked_sub(self.interval * self.burst);
            let slot = match (*next, floor) {
                (Some(scheduled), Some(f)) => scheduled.max(f),
                (Some(scheduled), None) => scheduled,
                (None, Some(f)) => f,
                (None, None) => now,
            };
            *next = Some(slot + self.interval);
            slot.saturating_duration_since(now)
        };
        if !wait.is_zero() {
            tokio::time::sleep(wait).await;
        }
    }
}

/// Production [`HttpClient`] backed by `reqwest`, with per-host rate limiting.
pub struct ReqwestClient {
    inner: reqwest::Client,
    gates: HashMap<String, HostGate>,
}

impl ReqwestClient {
    /// Build a client with a descriptive `User-Agent` (required by zKillboard
    /// and good manners for ESI).
    pub fn new(user_agent: impl Into<String>) -> Self {
        let inner = reqwest::Client::builder()
            .user_agent(user_agent.into())
            .timeout(Duration::from_secs(20))
            .build()
            .expect("reqwest client builds with default config");

        let mut gates = HashMap::new();
        // zKillboard asks for ~1 req/s sustained. We allow a burst of 12 (covers
        // most locals instantly) then settle to ~2.5 req/s — snappy for the user,
        // still light on zKill, and the SQLite cache makes repeats free.
        gates.insert(
            "zkillboard.com".to_string(),
            HostGate::new(Duration::from_millis(400), 12),
        );
        // ESI is far more permissive (≈150 req/s burst); keep a generous bucket.
        gates.insert(
            "esi.evetech.net".to_string(),
            HostGate::new(Duration::from_millis(15), 40),
        );

        ReqwestClient { inner, gates }
    }

    async fn gate_for(&self, url: &str) {
        if let Some(host) = host_of(url) {
            if let Some(gate) = self.gates.get(host) {
                gate.acquire().await;
            }
        }
    }
}

fn host_of(url: &str) -> Option<&str> {
    let after_scheme = url.split("://").nth(1)?;
    let host = after_scheme.split(['/', '?']).next()?;
    // Strip any port.
    Some(host.split(':').next().unwrap_or(host))
}

async fn into_json(resp: reqwest::Response, url: &str) -> Result<Value> {
    let status = resp.status();
    let text = resp
        .text()
        .await
        .map_err(|e| Error::Http(format!("reading body from {url}: {e}")))?;

    if !status.is_success() {
        return Err(Error::Status {
            status: status.as_u16(),
            url: url.to_string(),
            body: text.chars().take(200).collect(),
        });
    }

    serde_json::from_str(&text).map_err(|source| Error::Decode {
        context: url.to_string(),
        source,
    })
}

#[async_trait]
impl HttpClient for ReqwestClient {
    async fn get_json(&self, url: &str) -> Result<Value> {
        self.gate_for(url).await;
        let resp = self
            .inner
            .get(url)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| Error::Http(format!("GET {url}: {e}")))?;
        into_json(resp, url).await
    }

    async fn post_json(&self, url: &str, body: &Value) -> Result<Value> {
        self.gate_for(url).await;
        let resp = self
            .inner
            .post(url)
            .json(body)
            .send()
            .await
            .map_err(|e| Error::Http(format!("POST {url}: {e}")))?;
        into_json(resp, url).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(start_paused = true)]
    async fn gate_bursts_then_throttles() {
        // Move past the clock origin so the burst window doesn't underflow.
        tokio::time::sleep(Duration::from_secs(10)).await;

        let gate = HostGate::new(Duration::from_millis(500), 4);
        let start = tokio::time::Instant::now();
        for _ in 0..10 {
            gate.acquire().await;
        }
        let elapsed = start.elapsed();
        // ~5 of the 10 are absorbed by the burst credit; the rest throttle at
        // 500ms each → roughly 2.5s of waiting.
        assert!(elapsed >= Duration::from_millis(2400), "elapsed {elapsed:?}");
        assert!(elapsed <= Duration::from_millis(3100), "elapsed {elapsed:?}");
    }

    #[tokio::test(start_paused = true)]
    async fn zero_interval_never_waits() {
        let gate = HostGate::new(Duration::ZERO, 0);
        let start = tokio::time::Instant::now();
        for _ in 0..100 {
            gate.acquire().await;
        }
        assert_eq!(start.elapsed(), Duration::ZERO);
    }

    #[test]
    fn host_extraction() {
        assert_eq!(
            host_of("https://esi.evetech.net/latest/universe/ids/?x=1"),
            Some("esi.evetech.net")
        );
        assert_eq!(
            host_of("https://zkillboard.com/api/stats/characterID/1/"),
            Some("zkillboard.com")
        );
        assert_eq!(host_of("http://localhost:8080/x"), Some("localhost"));
        assert_eq!(host_of("not a url"), None);
    }
}
