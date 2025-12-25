use tauri_plugin_sql::{Migration, MigrationKind};

pub fn generate_migration() -> Vec<Migration> {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../../src/transaction/01-10/migration-01.sql"),
            kind: MigrationKind::Up,
        }, 
        Migration {
            version: 2,
            description: "update_discount",
            sql: include_str!("../../src/transaction/01-10/migration-02.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "update_product",
            sql: include_str!("../../src/transaction/01-10/migration-03.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "update_extra",
            sql: include_str!("../../src/transaction/01-10/migration-04.sql"),
            kind: MigrationKind::Up,
        },
    ];
    return migrations;
}
