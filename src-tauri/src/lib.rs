use log::LevelFilter;
use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../src/migration-01.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "fix_products_table",
            sql: include_str!("../src/migration-02.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "rename_variant_to_mode",
            sql: include_str!("../src/migration-03.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_grand_total",
            sql: include_str!("../src/migration-04.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_capital",
            sql: include_str!("../src/migration-05.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "change_disc_val_to_real",
            sql: include_str!("../src/migration-06.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "change_disc_val_to_real_2",
            sql: include_str!("../src/migration-07.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_rounding_table",
            sql: include_str!("../src/migration-08.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "fix_taxes?",
            sql: include_str!("../src/migration-09.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_credit",
            sql: include_str!("../src/migration-10.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "change_barcode_to_text",
            sql: include_str!("../src/migration-11.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "change_barcode_to_text_2",
            sql: include_str!("../src/migration-12.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "fix_capital",
            sql: include_str!("../src/migration-13.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "add_cashier",
            sql: include_str!("../src/migration-14.sql"),
            kind: MigrationKind::Up,
        },
    ];
    tauri::Builder::default()
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
                .add_migrations("sqlite:data.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        // .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
