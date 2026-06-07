//! Module **Pirate's Big Helper** — intel local-chat EVE Online.
//!
//! Tout le calcul lourd vit dans le crate `pbh-core` (réutilisé tel quel depuis
//! l'app standalone, logique inchangée). Cette couche ne fait que câbler l'état
//! partagé (moteur + cache SQLite), exposer les commandes IPC et mapper les
//! erreurs en `String` pour le front.
//!
//! Conformité : ESI public + zKillboard uniquement, User-Agent descriptif porté
//! par `pbh-core`. Aucune interaction avec le client EVE (EULA-safe).

use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use pbh_core::cache::Cache;
use pbh_core::engine::{
    sort_by_threat, Engine, DEFAULT_FIT_KILLMAILS, DEFAULT_NETWORK_KILLMAILS, DEFAULT_TTL_SECS,
};
use pbh_core::fit::FitPrediction;
use pbh_core::http::ReqwestClient;
use pbh_core::intel::NetworkAnalysis;
use pbh_core::model::{PilotIntel, WatchTag};
use pbh_core::parse::parse_local;
use pbh_core::postmortem::PostMortem;
use pbh_core::DEFAULT_USER_AGENT;
use serde::Serialize;
use tauri::{Emitter, Manager};

/// État du module Pirate, partagé entre les commandes IPC.
pub struct PirateState {
    engine: Engine<ReqwestClient>,
    /// Le handle SQLite est `Send` mais pas `Sync` ; le `Mutex` rend l'état
    /// partageable et n'est verrouillé que dans de courtes sections synchrones
    /// (jamais maintenu au travers d'un `.await`).
    cache: Mutex<Cache>,
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Construit l'état du module (moteur de production + cache SQLite dédié dans le
/// dossier de données de l'app). Appelé depuis le `setup` de la suite.
pub fn build_state<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> PirateState {
    let dir = app.path().app_data_dir().expect("resolve app data dir");
    std::fs::create_dir_all(&dir).expect("create app data dir");
    let db_path = dir.join("pbh-cache.sqlite");
    let cache = Cache::open(db_path.to_str().expect("utf-8 cache path")).expect("open cache");
    let engine = Engine::production(DEFAULT_USER_AGENT);
    PirateState {
        engine,
        cache: Mutex::new(cache),
    }
}

/// Handler de hotkey globale : lit le presse-papiers, ramène la fenêtre au
/// premier plan et demande au front d'analyser le texte collé. C'est le flux
/// « Ctrl+A / Ctrl+C dans EVE, puis hotkey » — pas besoin de focus l'app.
#[cfg(desktop)]
pub fn trigger_hotkey_analyze<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    let text = app.clipboard().read_text().unwrap_or_default();
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
        // Le front écoute cet évènement et lance le même flux que le collage.
        let _ = win.emit("hotkey-analyze", text);
    }
}

/// Analyse un blob de local-chat / liste de membres collé et renvoie la liste de
/// pilotes triée et scorée par menace. Le cache est consulté d'abord ; les ratés
/// sont résolus puis persistés.
#[tauri::command]
pub async fn pirate_analyze_local(
    text: String,
    state: tauri::State<'_, PirateState>,
) -> Result<Vec<PilotIntel>, String> {
    let names = parse_local(&text);
    if names.is_empty() {
        return Ok(Vec::new());
    }

    let now = unix_now();

    // Phase 1 (réseau) : noms → ids pour sonder le cache par id.
    let id_map = state.engine.resolve_ids(&names).await;

    // Phase 2 (sync, verrouillée) : séparer hits du cache et ratés.
    let (mut hits, miss_names): (Vec<PilotIntel>, Vec<String>) = {
        let cache = state.cache.lock().map_err(|e| e.to_string())?;
        let mut hits = Vec::new();
        let mut misses = Vec::new();
        for name in &names {
            match id_map.get(&name.to_lowercase()) {
                Some(&id) => match cache.get_pilot(id, DEFAULT_TTL_SECS, now) {
                    Ok(Some(intel)) => hits.push(intel),
                    _ => misses.push(name.clone()),
                },
                None => misses.push(name.clone()),
            }
        }
        (hits, misses)
    };

    // Phase 3 (réseau) : résoudre les ratés.
    let mut fresh = state.engine.resolve_names(&miss_names, now).await;

    // Phase 4 (sync, verrouillée) : persister les nouvelles lignes et ré-appliquer
    // les tags de surveillance.
    {
        let cache = state.cache.lock().map_err(|e| e.to_string())?;
        for intel in &mut fresh {
            let _ = cache.put_pilot(intel, now);
            if let Some(id) = intel.character_id {
                if let Ok(tag @ Some(_)) = cache.get_tag(id) {
                    intel.watch_tag = tag;
                }
            }
        }
    }

    hits.extend(fresh);
    sort_by_threat(&mut hits);
    Ok(hits)
}

/// Prédit ce qu'un pilote vole probablement, reconstruit depuis ses pertes
/// zKillboard récentes, avec repli sur la doctrine corpo/alliance pour les coques
/// qu'il n'a jamais personnellement perdues. Réseau seul, à la demande (le front
/// l'appelle à l'ouverture d'une ligne) — ne touche pas au cache.
#[tauri::command]
pub async fn pirate_predict_fit(
    character_id: i64,
    corporation_id: Option<i64>,
    alliance_id: Option<i64>,
    state: tauri::State<'_, PirateState>,
) -> Result<FitPrediction, String> {
    Ok(state
        .engine
        .predict_fit(
            character_id,
            corporation_id,
            alliance_id,
            DEFAULT_FIT_KILLMAILS,
        )
        .await)
}

/// Analyse le réseau de gang d'un pilote — avec qui il vole le plus souvent —
/// depuis ses kills récents. À la demande et sans cache.
#[tauri::command]
pub async fn pirate_analyze_network(
    character_id: i64,
    state: tauri::State<'_, PirateState>,
) -> Result<NetworkAnalysis, String> {
    Ok(state
        .engine
        .analyze_network(character_id, DEFAULT_NETWORK_KILLMAILS)
        .await)
}

/// Pose (ou retire, si `tag` vaut `None`) le tag de surveillance d'un personnage.
///
/// Quand `note` vaut `None`, la note existante est préservée — cela permet à la
/// table de changer un tag sans écraser une note éditée dans le panneau de
/// watchlist. Passer `Some(text)` (y compris `Some("")`) la fixe explicitement.
#[tauri::command]
pub fn pirate_set_watch_tag(
    character_id: i64,
    tag: Option<WatchTag>,
    note: Option<String>,
    state: tauri::State<'_, PirateState>,
) -> Result<(), String> {
    let cache = state.cache.lock().map_err(|e| e.to_string())?;
    let note = match note {
        Some(n) => n,
        None => cache
            .get_note(character_id)
            .map_err(|e| e.to_string())?
            .unwrap_or_default(),
    };
    cache
        .set_tag(character_id, tag, &note)
        .map_err(|e| e.to_string())
}

// ───────────────────────── Loss Analyzer ─────────────────────────
//
// Le module « Loss Post-Mortem Analyzer » réutilise le **même moteur** (ESI +
// zKillboard, User-Agent conforme porté par `pbh-core`) que l'intel Pirate.
// Toutes ces commandes sont à la demande et sans cache (post-mortem ponctuel).

/// Post-mortem d'un killmail par id (+ hash optionnel d'un lien ESI ; sinon
/// résolu via zKill). Renvoie le détail digeste : victime, attaquants, dégâts,
/// composition de gang, valeurs ISK et fit reconstruit.
#[tauri::command]
pub async fn loss_analyze_killmail(
    killmail_id: i64,
    hash: Option<String>,
    state: tauri::State<'_, PirateState>,
) -> Result<PostMortem, String> {
    state
        .engine
        .analyze_killmail(killmail_id, hash)
        .await
        .map_err(|e| e.to_string())
}

/// Post-mortem de la **dernière perte** d'un personnage. `Ok(None)` s'il n'a
/// aucune perte au tableau de chasse.
#[tauri::command]
pub async fn loss_analyze_latest(
    character_id: i64,
    state: tauri::State<'_, PirateState>,
) -> Result<Option<PostMortem>, String> {
    state
        .engine
        .analyze_latest_loss(character_id)
        .await
        .map_err(|e| e.to_string())
}

/// Résout un nom de personnage en id (pour le flux « colle un pseudo »).
/// `Ok(None)` si ESI ne le reconnaît pas comme personnage.
#[tauri::command]
pub async fn loss_resolve_character(
    name: String,
    state: tauri::State<'_, PirateState>,
) -> Result<Option<i64>, String> {
    Ok(state.engine.resolve_character(&name).await)
}

#[derive(Serialize)]
pub struct WatchlistEntry {
    character_id: i64,
    tag: WatchTag,
    note: String,
    /// Dernier nom connu depuis le cache de pilotes, s'il a déjà été résolu.
    name: Option<String>,
}

/// Renvoie la watchlist personnelle complète, ids les plus récents d'abord.
#[tauri::command]
pub fn pirate_get_watchlist(
    state: tauri::State<'_, PirateState>,
) -> Result<Vec<WatchlistEntry>, String> {
    let cache = state.cache.lock().map_err(|e| e.to_string())?;
    let entries = cache
        .watchlist_detailed()
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|(character_id, tag, note, name)| WatchlistEntry {
            character_id,
            tag,
            note,
            name,
        })
        .collect();
    Ok(entries)
}
