//! Proxy ESI conforme aux règles CCP : User-Agent identifiant l'app + contact,
//! lecture du quota d'erreurs et des en-têtes de cache/pagination.

use serde::Serialize;
use std::collections::HashMap;
use std::time::UNIX_EPOCH;

/// User-Agent obligatoire (nom/version + contact + source). Doit rester aligné
/// avec `src/core/app.ts` côté front.
const USER_AGENT: &str =
    "EVE Tools Suite/0.1.0 (lacausecrypto@gmail.com; +https://github.com/lacausecrypto/eve-tools-suite)";
const ESI_BASE: &str = "https://esi.evetech.net/latest";

#[derive(Serialize)]
pub struct EsiResponse {
    pub data: serde_json::Value,
    pub status: u16,
    /// Expiration du cache (ms epoch) ou 0.
    pub expires: i64,
    pub pages: u32,
    #[serde(rename = "errorLimitRemain")]
    pub error_limit_remain: i32,
}

/// Effectue une requête ESI et renvoie corps + métadonnées (cache, pages, quota).
///
/// Si `character_id` est fourni, la requête est **authentifiée** : un access token
/// valide est obtenu (rafraîchi au besoin depuis le trousseau) et posé en
/// `Authorization: Bearer`. Sinon, requête ESI publique.
#[tauri::command]
pub async fn esi_request(
    path: String,
    query: HashMap<String, serde_json::Value>,
    method: String,
    body: Option<serde_json::Value>,
    character_id: Option<i64>,
    tokens: tauri::State<'_, crate::sso::TokenCache>,
) -> Result<EsiResponse, String> {
    let full = format!("{}{}", ESI_BASE, path);
    let mut url = url::Url::parse(&full).map_err(|e| e.to_string())?;
    {
        let mut qp = url.query_pairs_mut();
        qp.append_pair("datasource", "tranquility");
        for (k, v) in &query {
            let s = match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            qp.append_pair(k, &s);
        }
    }

    let client = reqwest::Client::new();
    let mut req = match method.as_str() {
        "POST" => client.post(url),
        _ => client.get(url),
    };
    req = req
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/json");
    // Requête authentifiée : access token valide (rafraîchi au besoin).
    if let Some(cid) = character_id {
        let token = crate::sso::access_token(tokens.inner(), cid).await?;
        req = req.header("Authorization", format!("Bearer {token}"));
    }
    if let Some(b) = body {
        req = req.json(&b);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let headers = resp.headers().clone();

    let expires = headers
        .get("expires")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| httpdate::parse_http_date(s).ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let pages = headers
        .get("x-pages")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(1);
    let error_limit_remain = headers
        .get("x-esi-error-limit-remain")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(100);

    let data = resp
        .json::<serde_json::Value>()
        .await
        .unwrap_or(serde_json::Value::Null);

    Ok(EsiResponse {
        data,
        status,
        expires,
        pages,
        error_limit_remain,
    })
}

/// Hôtes tiers autorisés (étiquette + anti-SSRF). Seuls ces hôtes peuvent être
/// appelés via `third_party_get`.
const ALLOWED_HOSTS: &[&str] = &[
    "market.fuzzwork.co.uk",
    "www.fuzzwork.co.uk",
    "fuzzwork.co.uk",
    "mutamarket.com",
    "sde.hoboleaks.space",
];

#[derive(Serialize)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
}

/// GET vers un **service tiers** (Fuzzwork, MutaMarket…) en posant le User-Agent
/// de l'app (la webview ne peut pas le faire). Restreint à une liste d'hôtes
/// autorisés (HTTPS uniquement) pour éviter tout détournement.
#[tauri::command]
pub async fn third_party_get(url: String) -> Result<HttpResponse, String> {
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if parsed.scheme() != "https" {
        return Err("HTTPS requis".into());
    }
    let host = parsed.host_str().unwrap_or("");
    if !ALLOWED_HOSTS.contains(&host) {
        return Err(format!("hôte tiers non autorisé : {host}"));
    }
    let client = reqwest::Client::new();
    let resp = client
        .get(parsed)
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let body = resp.text().await.unwrap_or_default();
    Ok(HttpResponse { status, body })
}
