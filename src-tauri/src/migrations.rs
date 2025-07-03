use tauri_plugin_sql::{Migration, MigrationKind};

pub fn generate_migration() -> Vec<Migration> {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../src/migrations-sql/01-10/migration-01.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "fix_products_table",
            sql: include_str!("../src/migrations-sql/01-10/migration-02.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "rename_variant_to_mode",
            sql: include_str!("../src/migrations-sql/01-10/migration-03.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_grand_total",
            sql: include_str!("../src/migrations-sql/01-10/migration-04.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_capital",
            sql: include_str!("../src/migrations-sql/01-10/migration-05.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "change_disc_val_to_real",
            sql: include_str!("../src/migrations-sql/01-10/migration-06.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "change_disc_val_to_real_2",
            sql: include_str!("../src/migrations-sql/01-10/migration-07.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_rounding_table",
            sql: include_str!("../src/migrations-sql/01-10/migration-08.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "fix_taxes?",
            sql: include_str!("../src/migrations-sql/01-10/migration-09.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "add_credit",
            sql: include_str!("../src/migrations-sql/01-10/migration-10.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "change_barcode_to_text",
            sql: include_str!("../src/migrations-sql/11-20/migration-11.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "change_barcode_to_text_2",
            sql: include_str!("../src/migrations-sql/11-20/migration-12.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "fix_capital",
            sql: include_str!("../src/migrations-sql/11-20/migration-13.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "add_cashier",
            sql: include_str!("../src/migrations-sql/11-20/migration-14.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "fix_taxes_table",
            sql: include_str!("../src/migrations-sql/11-20/migration-15.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "redo_records_and_record_items",
            sql: include_str!("../src/migrations-sql/11-20/migration-16.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "add_note_to_products",
            sql: include_str!("../src/migrations-sql/11-20/migration-17.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "change_taxes_to_others",
            sql: include_str!("../src/migrations-sql/11-20/migration-18.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "add_discounts",
            sql: include_str!("../src/migrations-sql/11-20/migration-19.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "add_password_field_to_cashiers",
            sql: include_str!("../src/migrations-sql/11-20/migration-20.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "remove_cashier_reference",
            sql: include_str!("../src/migrations-sql/21-30/migration-21.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 22,
            description: "convert_price_to_real",
            sql: include_str!("../src/migrations-sql/21-30/migration-22.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 23,
            description: "update_products",
            sql: include_str!("../src/migrations-sql/21-30/migration-23.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 24,
            description: "ON_UPDATE_CASCADE",
            sql: include_str!("../src/migrations-sql/21-30/migration-24.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 25,
            description: "add_images",
            sql: include_str!("../src/migrations-sql/21-30/migration-25.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 26,
            description: "add_socials",
            sql: include_str!("../src/migrations-sql/21-30/migration-26.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 27,
            description: "add_money",
            sql: include_str!("../src/migrations-sql/21-30/migration-27.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 28,
            description: "update_money_table",
            sql: include_str!("../src/migrations-sql/21-30/migration-28.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 29,
            description: "add_payment_method",
            sql: include_str!("../src/migrations-sql/21-30/migration-29.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 30,
            description: "update_money_table",
            sql: include_str!("../src/migrations-sql/21-30/migration-30.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 31,
            description: "refactor_product_table",
            sql: include_str!("../src/migrations-sql/31-40/migration-31.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 32,
            description: "create_new_cashiers_table",
            sql: include_str!("../src/migrations-sql/31-40/migration-32.sql"),
            kind: MigrationKind::Up,
        },
    ];
    return migrations;
}
