use log::LevelFilter;
mod auth;
mod database;
mod jwt;
mod transaction;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database_migs = database::generate_migration();
    let transaction_migs = transaction::generate_migration();
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tx.db", transaction_migs)
                .add_migrations("sqlite:data.db", database_migs)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            auth::hash_password,
            auth::verify_password,
            jwt::decode_jwt,
            jwt::encode_jwt,
        ]);
    // Only enable the plugin in production
    #[cfg(not(debug_assertions))]
    let builder = builder.plugin(tauri_plugin_prevent_default::init());

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
