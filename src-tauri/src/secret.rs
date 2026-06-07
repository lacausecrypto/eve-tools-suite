//! Stockage sécurisé des secrets via le **trousseau de l'OS** (Keychain macOS,
//! Credential Manager Windows, Secret Service Linux) — les refresh tokens ESI ne
//! sont jamais écrits en clair sur disque ni exposés au front.

use keyring::Entry;

const SERVICE: &str = "eve-tools-suite";
/// Compte spécial stockant l'index JSON des sessions (sans tokens).
const INDEX_ACCOUNT: &str = "__sessions_index__";

fn entry(account: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, account).map_err(|e| e.to_string())
}

pub fn store_refresh(character_id: i64, refresh_token: &str) -> Result<(), String> {
    entry(&character_id.to_string())?
        .set_password(refresh_token)
        .map_err(|e| e.to_string())
}

/// Lu lors des appels ESI authentifiés pour rafraîchir l'access token.
pub fn get_refresh(character_id: i64) -> Result<String, String> {
    entry(&character_id.to_string())?
        .get_password()
        .map_err(|e| e.to_string())
}

pub fn delete_refresh(character_id: i64) -> Result<(), String> {
    let _ = entry(&character_id.to_string())?.delete_credential();
    Ok(())
}

pub fn read_index() -> String {
    entry(INDEX_ACCOUNT)
        .ok()
        .and_then(|e| e.get_password().ok())
        .unwrap_or_else(|| "[]".to_string())
}

pub fn write_index(json: &str) -> Result<(), String> {
    entry(INDEX_ACCOUNT)?
        .set_password(json)
        .map_err(|e| e.to_string())
}
