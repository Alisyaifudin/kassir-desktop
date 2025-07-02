mod migrations;
use log::LevelFilter;
mod api;
mod auth;
mod jwt;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migs = migrations::generate_migration();
    tauri::Builder::default()
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
                .add_migrations("sqlite:data.db", migs)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap().to_path_buf();
            tauri::async_runtime::spawn(async move {
                let _ = std::fs::create_dir_all(&app_dir);
                let db_path = app_dir.join("data.db");

                let options = sqlx::sqlite::SqliteConnectOptions::new()
                    .filename(&db_path)
                    .create_if_missing(true);

                match sqlx::SqlitePool::connect_with(options).await {
                    Ok(pool) => {
                        tauri::async_runtime::spawn(async move {
                            api::create_server(pool).await;
                        });
                    }
                    Err(e) => {
                        eprintln!("Database connection failed: {:?}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::hash_password,
            auth::verify_password,
            jwt::decode_jwt,
            jwt::encode_jwt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
