//! Test-only HTTP mock. Routes are matched by substring against the request URL
//! so tests can key on a path fragment like `/characters/92532650/`.

use async_trait::async_trait;
use serde_json::Value;

use crate::error::{Error, Result};
use crate::http::HttpClient;

#[derive(Default)]
pub struct MockHttp {
    get_routes: Vec<(String, Value)>,
    post_routes: Vec<(String, Value)>,
}

impl MockHttp {
    pub fn new() -> Self {
        MockHttp::default()
    }

    /// Register a canned response for any GET whose URL contains `needle`.
    pub fn with_get(mut self, needle: &str, body: Value) -> Self {
        self.get_routes.push((needle.to_string(), body));
        self
    }

    /// Register a canned response for any POST whose URL contains `needle`.
    pub fn with_post(mut self, needle: &str, body: Value) -> Self {
        self.post_routes.push((needle.to_string(), body));
        self
    }
}

#[async_trait]
impl HttpClient for MockHttp {
    async fn get_json(&self, url: &str) -> Result<Value> {
        for (needle, body) in &self.get_routes {
            if url.contains(needle.as_str()) {
                return Ok(body.clone());
            }
        }
        Err(Error::Http(format!("MockHttp: no GET route for {url}")))
    }

    async fn post_json(&self, url: &str, _body: &Value) -> Result<Value> {
        for (needle, body) in &self.post_routes {
            if url.contains(needle.as_str()) {
                return Ok(body.clone());
            }
        }
        Err(Error::Http(format!("MockHttp: no POST route for {url}")))
    }
}
