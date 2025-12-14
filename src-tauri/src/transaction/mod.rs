use tauri_plugin_sql::{Migration, MigrationKind};

pub fn generate_migration() -> Vec<Migration> {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("../../src/transaction/01-10/migration-01.sql"),
        kind: MigrationKind::Up,
    }];
    return migrations;
}
