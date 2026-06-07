//! Crate-wide error type.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("http error: {0}")]
    Http(String),

    #[error("api returned status {status} for {url}: {body}")]
    Status {
        status: u16,
        url: String,
        body: String,
    },

    #[error("failed to decode response from {context}: {source}")]
    Decode {
        context: String,
        #[source]
        source: serde_json::Error,
    },

    #[error("cache error: {0}")]
    Cache(#[from] rusqlite::Error),

    #[error("no character names found in pasted text")]
    EmptyInput,
}

pub type Result<T> = std::result::Result<T, Error>;
