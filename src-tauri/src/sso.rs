//! EVE SSO — flux OAuth2 **PKCE** pour client public (desktop), redirection
//! loopback locale, et stockage sécurisé du refresh token (trousseau OS).
//!
//! ⚠️ Renseigner `CLIENT_ID` après enregistrement de l'application sur
//! https://developers.eveonline.com (type « Authentication Only » ou avec scopes,
//! Callback URL = `http://localhost:41789/sso/callback`).
//!
//! Conformité/sécurité : l'identité (character id/name/scopes) est extraite de
//! l'access token **après vérification de la signature JWT contre le JWKS CCP**
//! (login.eveonline.com/oauth/jwks) — émetteur, expiration et audience validés.

use crate::secret;
use base64::Engine;
use jsonwebtoken::jwk::JwkSet;
use jsonwebtoken::{decode, decode_header, DecodingKey, Validation};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

const CLIENT_ID: &str = "25e65145aa044cfdbaf2b710bdf8d767"; // app publique PKCE (developers.eveonline.com)
const CALLBACK_PORT: u16 = 41789;
const AUTHORIZE_URL: &str = "https://login.eveonline.com/v2/oauth/authorize";
const TOKEN_URL: &str = "https://login.eveonline.com/v2/oauth/token";
const JWKS_URL: &str = "https://login.eveonline.com/oauth/jwks";
const ISSUERS: &[&str] = &["login.eveonline.com", "https://login.eveonline.com"];

/// Cache du JWKS CCP (rarement modifié) le temps de la session.
static JWKS_CACHE: Mutex<Option<JwkSet>> = Mutex::new(None);
const USER_AGENT: &str = concat!(
    "EVE Tools Suite/",
    env!("CARGO_PKG_VERSION"),
    " (lacausecrypto@gmail.com; +https://github.com/lacausecrypto/eve-tools-suite)"
);

#[derive(Serialize, Deserialize, Clone)]
pub struct CharacterSession {
    #[serde(rename = "characterId")]
    pub character_id: i64,
    #[serde(rename = "characterName")]
    pub character_name: String,
    pub scopes: Vec<String>,
    #[serde(rename = "expiresAt")]
    pub expires_at: i64,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
    expires_in: i64,
}

/// Access token mis en cache mémoire (jamais persisté sur disque).
struct CachedToken {
    access_token: String,
    expires_at_ms: i64,
}

/// Cache mémoire des access tokens par personnage, partagé via l'état Tauri.
/// Les refresh tokens vivent dans le trousseau ; seuls les access tokens
/// (courte durée) transitent ici, et jamais vers le front.
#[derive(Default)]
pub struct TokenCache(Mutex<HashMap<i64, CachedToken>>);

/// Renvoie un access token **valide** pour le personnage : sert le cache si
/// encore frais, sinon rafraîchit via le refresh token du trousseau (rotation
/// du refresh token gérée). Erreur si `CLIENT_ID` non configuré (cf. M5).
pub async fn access_token(cache: &TokenCache, character_id: i64) -> Result<String, String> {
    // Chemin rapide : token encore valide (marge de 15 s).
    {
        let map = cache.0.lock().map_err(|e| e.to_string())?;
        if let Some(tok) = map.get(&character_id) {
            if tok.expires_at_ms > now_ms() + 15_000 {
                return Ok(tok.access_token.clone());
            }
        }
    }

    if CLIENT_ID.is_empty() {
        return Err(
            "ESI_CLIENT_ID non configuré — renseigne CLIENT_ID (src-tauri/src/sso.rs) après enregistrement de l'app (cf. M5).".into(),
        );
    }

    let refresh = secret::get_refresh(character_id)?;
    let client = reqwest::Client::new();
    let token: TokenResponse = client
        .post(TOKEN_URL)
        .header("User-Agent", USER_AGENT)
        .header("Host", "login.eveonline.com")
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", &refresh),
            ("client_id", CLIENT_ID),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|_| "échec du rafraîchissement du token (refresh invalide ?)".to_string())?;

    // EVE SSO fait tourner le refresh token : on persiste le nouveau.
    secret::store_refresh(character_id, &token.refresh_token)?;
    let expires_at_ms = now_ms() + token.expires_in * 1000;
    cache_put(cache, character_id, &token.access_token, expires_at_ms)?;
    Ok(token.access_token)
}

/// Insère/écrase l'access token mis en cache pour un personnage.
fn cache_put(
    cache: &TokenCache,
    character_id: i64,
    access_token: &str,
    expires_at_ms: i64,
) -> Result<(), String> {
    let mut map = cache.0.lock().map_err(|e| e.to_string())?;
    map.insert(
        character_id,
        CachedToken {
            access_token: access_token.to_string(),
            expires_at_ms,
        },
    );
    Ok(())
}

/// Retire l'access token mis en cache (à la déconnexion).
fn cache_forget(cache: &TokenCache, character_id: i64) {
    if let Ok(mut map) = cache.0.lock() {
        map.remove(&character_id);
    }
}

fn random_string(len: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let mut rng = rand::thread_rng();
    (0..len)
        .map(|_| CHARSET[rng.gen_range(0..CHARSET.len())] as char)
        .collect()
}

fn pkce_challenge(verifier: &str) -> String {
    let digest = Sha256::digest(verifier.as_bytes());
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest)
}

/// Récupère le JWKS CCP (caché en mémoire pour la session).
async fn jwks() -> Result<JwkSet, String> {
    if let Ok(guard) = JWKS_CACHE.lock() {
        if let Some(set) = guard.as_ref() {
            return Ok(set.clone());
        }
    }
    let client = reqwest::Client::new();
    let set: JwkSet = client
        .get(JWKS_URL)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| format!("JWKS illisible: {e}"))?;
    if let Ok(mut guard) = JWKS_CACHE.lock() {
        *guard = Some(set.clone());
    }
    Ok(set)
}

/// `aud` du JWT contient-il la valeur attendue (string ou tableau) ?
fn aud_contains(claims: &serde_json::Value, expected: &str) -> bool {
    match claims.get("aud") {
        Some(serde_json::Value::String(s)) => s == expected,
        Some(serde_json::Value::Array(a)) => a.iter().any(|x| x.as_str() == Some(expected)),
        _ => false,
    }
}

/// Extrait l'identité depuis des claims JWT **déjà vérifiés**.
fn identity_from_claims(v: &serde_json::Value) -> Result<CharacterSession, String> {
    let sub = v.get("sub").and_then(|s| s.as_str()).ok_or("sub absent")?;
    let character_id = sub
        .rsplit(':')
        .next()
        .and_then(|s| s.parse::<i64>().ok())
        .ok_or("character id illisible")?;
    let character_name = v.get("name").and_then(|s| s.as_str()).unwrap_or("").to_string();
    let scopes = match v.get("scp") {
        Some(serde_json::Value::Array(a)) => a.iter().filter_map(|x| x.as_str().map(String::from)).collect(),
        Some(serde_json::Value::String(s)) => vec![s.clone()],
        _ => vec![],
    };
    Ok(CharacterSession { character_id, character_name, scopes, expires_at: 0 })
}

/// Vérifie la **signature** de l'access token contre le JWKS CCP (+ émetteur,
/// expiration, audience) puis en extrait l'identité de confiance.
async fn verify_jwt(access_token: &str) -> Result<CharacterSession, String> {
    let header = decode_header(access_token).map_err(|e| format!("entête JWT: {e}"))?;
    let kid = header.kid.clone().ok_or("kid absent du JWT")?;
    let set = jwks().await?;
    let jwk = set.find(&kid).ok_or("clé JWKS introuvable pour ce kid")?;
    let key = DecodingKey::from_jwk(jwk).map_err(|e| e.to_string())?;

    let mut validation = Validation::new(header.alg);
    validation.set_issuer(ISSUERS);
    validation.validate_exp = true;
    // L'audience CCP = client_id (+ "EVE Online") ; on la valide manuellement.
    validation.validate_aud = false;

    let data = decode::<serde_json::Value>(access_token, &key, &validation)
        .map_err(|e| format!("signature/claims JWT invalides: {e}"))?;
    let claims = data.claims;

    if !CLIENT_ID.is_empty() && !aud_contains(&claims, CLIENT_ID) && !aud_contains(&claims, "EVE Online") {
        return Err("audience JWT inattendue".into());
    }
    identity_from_claims(&claims)
}

/// Démarre le serveur loopback et attend le `code` + `state` du callback.
fn wait_for_callback() -> Result<(String, String), String> {
    let server = tiny_http::Server::http(("127.0.0.1", CALLBACK_PORT))
        .map_err(|e| e.to_string())?;
    let request = server.recv().map_err(|e| e.to_string())?;
    let url = format!("http://localhost{}", request.url());
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    let mut code = None;
    let mut state = None;
    for (k, val) in parsed.query_pairs() {
        match k.as_ref() {
            "code" => code = Some(val.to_string()),
            "state" => state = Some(val.to_string()),
            _ => {}
        }
    }
    let html = "<html><body style='font-family:sans-serif;background:#0b0d12;color:#eee;text-align:center;padding-top:60px'>\
        <h2>Connexion EVE réussie ✅</h2><p>Tu peux fermer cette fenêtre et revenir à EVE Tools.</p></body></html>";
    let response = tiny_http::Response::from_string(html).with_header(
        "Content-Type: text/html; charset=utf-8"
            .parse::<tiny_http::Header>()
            .unwrap(),
    );
    let _ = request.respond(response);
    match (code, state) {
        (Some(c), Some(s)) => Ok((c, s)),
        _ => Err("callback sans code/state".into()),
    }
}

/// Lance le login EVE SSO (PKCE) pour les scopes demandés.
#[tauri::command]
pub async fn sso_login(
    scopes: Vec<String>,
    tokens: tauri::State<'_, TokenCache>,
) -> Result<CharacterSession, String> {
    if CLIENT_ID.is_empty() {
        return Err(
            "ESI_CLIENT_ID non configuré — enregistre l'app sur developers.eveonline.com puis renseigne CLIENT_ID (src-tauri/src/sso.rs) et clientId (src/core/app.ts).".into(),
        );
    }

    let verifier = random_string(64);
    let challenge = pkce_challenge(&verifier);
    let state = random_string(24);
    let redirect_uri = format!("http://localhost:{}/sso/callback", CALLBACK_PORT);

    let mut auth = url::Url::parse(AUTHORIZE_URL).map_err(|e| e.to_string())?;
    auth.query_pairs_mut()
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("client_id", CLIENT_ID)
        .append_pair("scope", &scopes.join(" "))
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", &state);

    open::that(auth.as_str()).map_err(|e| e.to_string())?;

    // Attente du callback (bloquant) avec délai max, hors du runtime async.
    let (code, returned_state) = tokio::time::timeout(
        Duration::from_secs(180),
        tokio::task::spawn_blocking(wait_for_callback),
    )
    .await
    .map_err(|_| "délai de connexion dépassé".to_string())?
    .map_err(|e| e.to_string())??;

    if returned_state != state {
        return Err("state OAuth invalide (anti-CSRF)".into());
    }

    // Échange du code contre les tokens (PKCE, client public).
    let client = reqwest::Client::new();
    let token: TokenResponse = client
        .post(TOKEN_URL)
        .header("User-Agent", USER_AGENT)
        .header("Host", "login.eveonline.com")
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", &code),
            ("client_id", CLIENT_ID),
            ("code_verifier", &verifier),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let mut session = verify_jwt(&token.access_token).await?;
    session.expires_at = (now_ms()) + token.expires_in * 1000;

    // Stockage : refresh token au trousseau, session (sans token) dans l'index,
    // et ensemencement du cache mémoire (évite un refresh immédiat).
    secret::store_refresh(session.character_id, &token.refresh_token)?;
    upsert_session(&session)?;
    cache_put(
        tokens.inner(),
        session.character_id,
        &token.access_token,
        session.expires_at,
    )?;

    Ok(session)
}

/// Déconnecte un personnage : efface le refresh token, l'entrée d'index et
/// l'access token mis en cache.
#[tauri::command]
pub fn sso_logout(
    character_id: i64,
    tokens: tauri::State<'_, TokenCache>,
) -> Result<(), String> {
    secret::delete_refresh(character_id)?;
    cache_forget(tokens.inner(), character_id);
    let mut list = load_index();
    list.retain(|s| s.character_id != character_id);
    save_index(&list)
}

/// Liste les personnages connectés (sans tokens).
#[tauri::command]
pub fn sso_sessions() -> Result<Vec<CharacterSession>, String> {
    Ok(load_index())
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn load_index() -> Vec<CharacterSession> {
    serde_json::from_str(&secret::read_index()).unwrap_or_default()
}

fn save_index(list: &[CharacterSession]) -> Result<(), String> {
    let json = serde_json::to_string(list).map_err(|e| e.to_string())?;
    secret::write_index(&json)
}

fn upsert_session(session: &CharacterSession) -> Result<(), String> {
    let mut list = load_index();
    list.retain(|s| s.character_id != session.character_id);
    list.push(session.clone());
    save_index(&list)
}
