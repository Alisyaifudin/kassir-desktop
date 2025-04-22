use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        // Define your migrations here
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price TEXT NOT NULL, stock INTEGER NOT NULL, barcode TEXT UNIQUE);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_record_tables",
            sql: "CREATE TABLE records ( \
            id INTEGER PRIMARY KEY, \
            time INTEGER NOT NULL, \
            total TEXT NOT NULL, \
            pay TEXT NOT NULL, \
            disc_val TEXT, \
            disc_type TEXT CHECK (disc_type IN ('number', 'percent')), \
            change TEXT NOT NULL \
            ); \
            CREATE TABLE record_items ( \
            id INTEGER PRIMARY KEY, \
            record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
            name TEXT NOT NULL, \
            price TEXT NOT NULL, \
            qty INTEGER NOT NULL, \
            subtotal TEXT NOT NULL, \
            disc_val TEXT, \
            disc_type TEXT CHECK (disc_type IN ('number', 'percent')), \
            time INTEGER NOT NULL \
            );",
            kind: MigrationKind::Up,
        }
    ];
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:mydatabase.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
