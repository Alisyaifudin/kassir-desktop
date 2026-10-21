use log::LevelFilter;
mod auth;
mod database;
mod jwt;
mod printer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database_migs = database::generate_migration();
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_http::init()) // Add this line
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:data.db", database_migs)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            auth::hash_password,
            auth::verify_password,
            jwt::decode_jwt,
            jwt::encode_jwt,
            printer::get_printers,
            printer::print_pdf,
        ]);

    // Debug-only MCP bridge for AI/e2e automation.
    // Bound to 127.0.0.1 so the automation socket is never reachable from the LAN,
    // and never registered in release builds.
    // Requires `app.withGlobalTauri = true`, see src-tauri/tauri.dev.conf.json.
    #[cfg(debug_assertions)]
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
                    | tauri_plugin_prevent_default::Flags::FIND
                    | tauri_plugin_prevent_default::Flags::PRINT,
            ))
            .build();

    builder
        .plugin(prevent_default_plugin)
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
