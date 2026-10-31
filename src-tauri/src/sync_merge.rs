//! A real SQLite transaction for the pull merge.
//!
//! # Why this command exists
//!
//! `tauri-plugin-sql` exposes `execute(query, values)` and `select(...)`, and nothing
//! else: there is no way to hold a transaction open across calls, and its `execute`
//! runs a multi-statement string statement by statement in **autocommit** mode. So
//! the "one transaction for the whole pull" that the sync contract asks for (§5.2,
//! §5.3 commit unit) cannot be built on the plugin's command surface — a merge of
//! thousands of statements would commit row by row, and a failure halfway through
//! would leave the mirror visibly half-merged to the *next* reader.
//!
//! # Why this does not fork the plugin
//!
//! It does not need to. The plugin publishes exactly the seams required:
//!
//!   * `DbInstances(pub RwLock<HashMap<String, DbPool>>)` is managed state, and its
//!     field is public;
//!   * `DbPool` is a public enum whose `Sqlite` variant carries the plugin's own
//!     `sqlx::Pool<Sqlite>`.
//!
//! Its own documentation says so: "It is managed as Tauri state, so Rust code can
//! reach the pools with `Manager::state` and run its own queries." This command
//! therefore borrows **the pool the app already uses**, which matters for more than
//! tidiness: a second connection of our own would need its own pragmas (foreign
//! keys, busy timeout, journal mode) and would open a lock-contention window in
//! which the POS's own writes could fail with `SQLITE_BUSY` while a long merge held
//! the write lock. One pool means one set of connections, one configuration, and the
//! same database instance the frontend talks to.
//!
//! # Why the plan is JSON
//!
//! The statements are generated in TypeScript (`src/services/sync/sql.ts`) from the
//! canonical column dictionaries, so the column order the wire contract freezes is
//! the same one the SQL uses. Rust only orchestrates: it does not know any entity,
//! and it does not build SQL. Values arrive typed (`null` / number / string) and are
//! bound — never interpolated — so a product name with a quote in it is just text.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::SqlitePool;
use tauri::{Manager, Runtime};

/// The connection string the frontend and the preload both use (`tauri.conf.json`
/// → `plugins.sql.preload`), and the key the plugin stores its pool under.
const DB_URL: &str = "sqlite:data.db";

/// One generated statement: SQL plus its already-ordered parameter list.
#[derive(Debug, Deserialize)]
pub struct MergeStatement {
    pub sql: String,
    #[serde(default)]
    pub bindings: Vec<Value>,
}

/// Everything one pull produced, ready to be applied atomically.
#[derive(Debug, Deserialize)]
pub struct MergePlan {
    pub statements: Vec<MergeStatement>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeApplied {
    pub statements: usize,
}

/// A failed merge. `index` and `sql` are the diagnostic (logged, not rendered);
/// `message` is the sentence the Sinkronisasi screen shows.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeFailure {
    pub code: String,
    pub message: String,
    pub index: i64,
    pub sql: String,
}

impl MergeFailure {
    fn pool(message: String) -> Self {
        Self {
            code: "db_unavailable".to_string(),
            message,
            index: -1,
            sql: String::new(),
        }
    }

    fn statement(index: usize, statement: &MergeStatement, error: impl std::fmt::Display) -> Self {
        let detail = error.to_string();
        // The SQL is a developer detail; the log keeps it, the screen does not.
        log::error!(
            "sync_merge statement {index} failed: {detail} | {} | {:?}",
            truncate(&statement.sql, 400),
            truncate_bindings(&statement.bindings)
        );
        Self {
            code: "statement_failed".to_string(),
            message: format!(
                "Sinkronisasi gagal disimpan pada pernyataan {}: {}",
                index + 1,
                short_sql_error(&detail)
            ),
            index: index as i64,
            sql: truncate(&statement.sql, 400),
        }
    }

    fn commit(error: impl std::fmt::Display) -> Self {
        let detail = error.to_string();
        log::error!("sync_merge commit failed: {detail}");
        Self {
            code: "commit_failed".to_string(),
            message: format!("Sinkronisasi gagal disimpan: {}", short_sql_error(&detail)),
            index: -1,
            sql: String::new(),
        }
    }
}

/// The plugin's pool for `sqlite:data.db`, already connected and migrated.
async fn pool<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<SqlitePool, MergeFailure> {
    // `try_state`: the plugin registers `DbInstances` from its setup hook, which runs
    // after the app is built. A merge can only be asked for from the UI, so the state
    // is always there in practice — but `state()` panics where this returns a sentence.
    let Some(instances) = app.try_state::<tauri_plugin_sql::DbInstances>() else {
        return Err(MergeFailure::pool(
            "Database belum siap. Jalankan ulang aplikasi.".to_string(),
        ));
    };
    let guard = instances.0.read().await;
    match guard.get(DB_URL) {
        Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => Ok(pool.clone()),
        _ => Err(MergeFailure::pool(
            "Database belum siap. Jalankan ulang aplikasi.".to_string(),
        )),
    }
}

/// Applies a merge plan in one transaction.
///
/// All or nothing: either every statement committed or the mirror is exactly as it
/// was. That is what lets `live.ts` advance the pull cursor only after this call
/// returns — a crash or a failure re-pulls the same gap, and every frame is
/// idempotent to re-merge anyway (LWW).
#[tauri::command]
pub async fn sync_merge<R: Runtime>(
    app: tauri::AppHandle<R>,
    plan: MergePlan,
) -> Result<MergeApplied, MergeFailure> {
    let total = plan.statements.len();
    if total == 0 {
        return Ok(MergeApplied { statements: 0 });
    }

    let pool = pool(&app).await?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| MergeFailure::pool(format!("Database sibuk: {error}")))?;

    for (index, statement) in plan.statements.iter().enumerate() {
        let mut query = sqlx::query(&statement.sql);
        for value in &statement.bindings {
            query = match value {
                Value::Null => query.bind(Option::<String>::None),
                Value::Bool(flag) => query.bind(if *flag { 1_i64 } else { 0_i64 }),
                Value::Number(number) => {
                    if let Some(integer) = number.as_i64() {
                        query.bind(integer)
                    } else if let Some(real) = number.as_f64() {
                        query.bind(real)
                    } else {
                        let failure =
                            MergeFailure::statement(index, statement, "angka di luar jangkauan");
                        let _ = transaction.rollback().await;
                        return Err(failure);
                    }
                }
                Value::String(text) => query.bind(text.as_str()),
                other => {
                    let failure = MergeFailure::statement(
                        index,
                        statement,
                        format!("tipe nilai tidak didukung: {other}"),
                    );
                    let _ = transaction.rollback().await;
                    return Err(failure);
                }
            };
        }

        // `&mut *transaction` is the connection the transaction owns; every
        // statement runs on it, so the batch is one atomic unit.
        if let Err(error) = query.execute(&mut *transaction).await {
            let failure = MergeFailure::statement(index, statement, error);
            let _ = transaction.rollback().await;
            return Err(failure);
        }
    }

    transaction.commit().await.map_err(MergeFailure::commit)?;
    log::info!("sync_merge committed {total} statement(s)");
    Ok(MergeApplied { statements: total })
}

/// SQLite's own words are the actionable part; the sqlx wrapper prefix is not.
fn short_sql_error(detail: &str) -> String {
    let trimmed = detail.trim();
    // sqlx formats as "error returned from database: (code: 1555) UNIQUE ...".
    match trimmed.split_once(": ") {
        Some((_, rest)) if rest.len() > 8 => rest.to_string(),
        _ => trimmed.to_string(),
    }
}

fn truncate(text: &str, limit: usize) -> String {
    if text.len() <= limit {
        return text.to_string();
    }
    let mut cut = limit;
    while cut > 0 && !text.is_char_boundary(cut) {
        cut -= 1;
    }
    format!("{}…", &text[..cut])
}

fn truncate_bindings(bindings: &[Value]) -> String {
    let rendered = format!("{bindings:?}");
    truncate(&rendered, 400)
}
