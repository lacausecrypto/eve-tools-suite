//! Backend Rust de la suite (Tauri). Expose au front :
//! - `esi_request`  : proxy ESI **conforme CCP** (User-Agent, quota d'erreurs) ;
//! - `sso_*`        : flux OAuth2 PKCE EVE SSO + stockage sécurisé des tokens ;
//! - `pirate_*`     : module Pirate's Big Helper (intel local-chat, moteur réutilisé).

mod esi;
mod pirate;
mod secret;
mod sso;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Migrations de la base partagée `eve-tools.db`. La table `kv` (clé/valeur
/// isolée par `ns`) sert de persistance commune aux modules.
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create kv table",
        sql: "CREATE TABLE IF NOT EXISTS kv (ns TEXT NOT NULL, k TEXT NOT NULL, v TEXT, PRIMARY KEY (ns, k));",
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Journalisation côté Rust (utile au module Pirate : ESI/zKillboard).
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .try_init();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        // Cache mémoire des access tokens ESI (par personnage), partagé.
        .manage(sso::TokenCache::default())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:eve-tools.db", migrations())
                .build(),
        );

    // Auto-update : desktop uniquement (vérifie GitHub Releases, MAJ signées).
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    // Hotkey globale : desktop uniquement (module Pirate).
    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        pirate::trigger_hotkey_analyze(app);
                    }
                })
                .build(),
        );
    }

    builder
        .setup(|app| {
            // État du module Pirate (moteur d'intel + cache SQLite dédié).
            let pirate_state = pirate::build_state(app.handle());
            app.manage(pirate_state);

            // Hotkey Pirate : Cmd+Shift+L (macOS) / Ctrl+Shift+L.
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut,
                };
                #[cfg(target_os = "macos")]
                let mods = Modifiers::SUPER | Modifiers::SHIFT;
                #[cfg(not(target_os = "macos"))]
                let mods = Modifiers::CONTROL | Modifiers::SHIFT;
                let shortcut = Shortcut::new(Some(mods), Code::KeyL);
                if let Err(e) = app.global_shortcut().register(shortcut) {
                    tracing::warn!("hotkey globale (Cmd/Ctrl+Shift+L) non enregistrée : {e}");
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            esi::esi_request,
            esi::third_party_get,
            sso::sso_login,
            sso::sso_logout,
            sso::sso_sessions,
            pirate::pirate_analyze_local,
            pirate::pirate_predict_fit,
            pirate::pirate_analyze_network,
            pirate::pirate_set_watch_tag,
            pirate::pirate_get_watchlist,
            pirate::loss_analyze_killmail,
            pirate::loss_analyze_latest,
            pirate::loss_resolve_character,
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de l'application Tauri");
}
