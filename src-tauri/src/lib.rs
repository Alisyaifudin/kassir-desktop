use log::LevelFilter;
use tauri::Manager;
mod auth;
mod database;
mod export;
mod printer;
mod receipt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database_migs = database::generate_migration();
    let builder = tauri::Builder::default()
        // Registered first, before any window or database plugin initialises: the
        // plugin must win the race on the instance lock. One process per machine
        // is the model — the app preloads a fixed `sqlite:data.db` and keeps the
        // cart and the catalogue in process-local refs, so a second launch would
        // debounce-write its own stale snapshot over the first one's rows.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:data.db", database_migs)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            auth::hash_password,
            auth::verify_password,
            printer::get_printers,
            printer::print_receipt,
            export::export_file,
        ]);

    // Debug-only MCP bridge for AI/e2e automation.
    // Bound to 127.0.0.1 so the automation socket is never reachable from the LAN,
    // and never registered in release builds. The plugin crate itself is an
    // optional dependency behind the `mcp-bridge` feature, so a release build
    // does not even link it; `bun run tauri:dev` passes the feature.
    // Requires `app.withGlobalTauri = true`, see src-tauri/tauri.dev.conf.json.
    #[cfg(all(debug_assertions, feature = "mcp-bridge"))]
    let builder = builder.plugin(
        tauri_plugin_mcp_bridge::Builder::new()
            .bind_address("127.0.0.1")
            .build(),
    );

    #[cfg(debug_assertions)]
    let prevent_default_plugin: tauri::plugin::TauriPlugin<tauri::Wry> =
        tauri_plugin_prevent_default::Builder::new()
            .with_flags(tauri_plugin_prevent_default::Flags::FIND)
            .build();
    // Only enable the plugin in production
    #[cfg(not(debug_assertions))]
    let prevent_default_plugin: tauri::plugin::TauriPlugin<tauri::Wry> =
        tauri_plugin_prevent_default::Builder::new()
            .with_flags(tauri_plugin_prevent_default::Flags::all().difference(
                tauri_plugin_prevent_default::Flags::CONTEXT_MENU
                    | tauri_plugin_prevent_default::Flags::RELOAD
                    | tauri_plugin_prevent_default::Flags::FOCUS_MOVE
                    | tauri_plugin_prevent_default::Flags::PRINT,
            ))
            .build();

    builder
        .plugin(prevent_default_plugin)
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
