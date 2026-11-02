//! Whole-install backup: one `.zip` holding the database, `store.json` and a
//! manifest that says what the archive is.
//!
//! # Why this is not a file copy
//!
//! `data.db` runs in WAL mode (`src/services/db/journal.ts`), so a committed
//! sale lives in `data.db-wal` until a checkpoint — and nothing in this app
//! checkpoints. A plain copy of `data.db` would therefore ship a database missing
//! everything written since the last checkpoint, silently: the cashier would hold
//! a "backup" that looks fine and is hours old. Copying `-wal` beside it is not a
//! fix either, since the two files are copied at different instants and `-shm` is
//! ephemeral.
//!
//! `VACUUM INTO` is the supported way out: it reads the live database in one
//! transaction and writes a consistent single-file snapshot, including commits
//! still sitting in the WAL, without pausing a single sale. It borrows the pool
//! the rest of the app uses (`sync_merge.rs` does the same, for the same reason —
//! one set of connections, one set of pragmas) instead of opening a second
//! connection that would need its own configuration.
//!
//! # Why the dialog and the write live here
//!
//! Same reason as `export.rs`: `capabilities/default.json` narrows the fs plugin
//! to `$APPDATA/images` and `$APPLOCALDATA/logs`, so a frontend write to a path
//! the cashier picked in a save dialog is `PathForbidden` in a packaged build.
//! Keeping the dialog and the write on this side leaves the ACL narrow *and* the
//! backup working, and the frontend never names a filesystem path.
//!
//! # Why an intermediate `.part`
//!
//! An archive is written over seconds, not milliseconds. Writing straight to the
//! chosen name means an error halfway leaves a truncated `.zip` that looks like a
//! backup until the day it is needed. The file is built beside the target and
//! renamed into place only once it is complete.

use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{ConnectOptions, Connection, SqlitePool};
use tauri::{command, Manager, Runtime};
use tauri_plugin_dialog::DialogExt;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

/// The connection string both the frontend and the preload use
/// (`tauri.conf.json` → `plugins.sql.preload`), and the key the plugin stores its
/// pool under.
const DB_URL: &str = "sqlite:data.db";

/// The store file, as `src/services/store/live.ts` names it. It resolves under
/// `app_data_dir`, while `data.db` resolves under `app_config_dir` — two
/// different directories, which is why the manifest records where each file
/// belongs instead of the restore path being guessed.
const STORE_FILE: &str = "store.json";

const FAILED: &str = "Gagal membuat cadangan. Coba pilih folder lain.";
const DB_BUSY: &str = "Database sibuk. Coba lagi sebentar lagi.";
const NOT_READY: &str = "Database belum siap. Jalankan ulang aplikasi.";
const CORRUPT: &str = "Cadangan gagal diperiksa dan tidak disimpan. Coba lagi.";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSaved {
    /// Where the archive was written, for the toast's "disimpan ke …".
    pub path: String,
    /// So the toast can say how big it is — the point of the number is that the
    /// cashier can see a backup is not empty.
    pub bytes: u64,
}

/// Writes a `.zip` backup and returns where it went.
///
/// `store_json` is the store as the frontend sees it, not as the file on disk:
/// `tauri-plugin-store` writes on a debounce, so reading `store.json` here would
/// race the last preference the cashier changed. The frontend serialises the
/// instance it already has, which is also the only copy that includes a write
/// still waiting for the debounce.
///
/// `Ok(None)` means the save dialog was cancelled: nothing was written, and the
/// caller must not report success.
#[command]
pub async fn backup_data<R: Runtime>(
    app: tauri::AppHandle<R>,
    store_json: String,
) -> Result<Option<BackupSaved>, String> {
    let Some(target) = ask_where(&app).await? else {
        return Ok(None);
    };

    // The snapshot needs a second copy of the database on disk while it exists,
    // so it lives in the OS temp directory rather than next to the user's file:
    // a failed backup should not leave a stray `data.db` in Documents.
    let dir = tempfile::tempdir().map_err(|error| {
        log::error!("backup_data tempdir failed: {error}");
        FAILED.to_string()
    })?;

    let snapshot = dir.path().join("data.db");
    vacuum_into(&app, &snapshot).await?;
    let schema = verify_snapshot(&snapshot).await?;

    let store_path = dir.path().join(STORE_FILE);
    fs::write(&store_path, store_json.as_bytes()).map_err(|error| {
        log::error!("backup_data failed writing the store copy: {error}");
        FAILED.to_string()
    })?;

    let manifest_path = dir.path().join("manifest.json");
    write_manifest(&manifest_path, &store_json, schema, &snapshot, &store_path)?;

    let payload = vec![
        ("data.db".to_string(), snapshot),
        (STORE_FILE.to_string(), store_path),
        ("manifest.json".to_string(), manifest_path),
    ];
    let archive = zip_into(&target, payload).await?;

    Ok(Some(archive))
}

/// The Save dialog, on a blocking thread.
///
/// A dialog blocks until the cashier answers it, so it must not run on the main
/// thread (the one driving the webview event loop) — same reason as
/// `printer.rs`. `None` is a cancellation, not an error.
async fn ask_where<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<Option<PathBuf>, String> {
    let default_name = format!(
        "kassir-backup-{}.zip",
        chrono::Local::now().format("%Y-%m-%d")
    );
    let app = app.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Simpan Cadangan")
            .set_file_name(default_name)
            .add_filter("ZIP", &["zip"])
            .blocking_save_file()
    })
    .await
    .map_err(|error| {
        log::error!("backup_data dialog task failed: {error}");
        FAILED.to_string()
    })?;

    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked
        .into_path()
        .map_err(|error| format!("Gagal membaca lokasi file: {error}"))?;
    Ok(Some(path))
}

/// The plugin's pool for `sqlite:data.db`, already connected and migrated.
async fn pool<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<SqlitePool, String> {
    let Some(instances) = app.try_state::<tauri_plugin_sql::DbInstances>() else {
        return Err(NOT_READY.to_string());
    };
    let guard = instances.0.read().await;
    match guard.get(DB_URL) {
        Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => Ok(pool.clone()),
        _ => Err(NOT_READY.to_string()),
    }
}

/// Writes a consistent snapshot of the live database to `destination`.
async fn vacuum_into<R: Runtime>(
    app: &tauri::AppHandle<R>,
    destination: &Path,
) -> Result<(), String> {
    // `VACUUM INTO` refuses to overwrite, which is what makes it safe to point at
    // a path inside a fresh temp dir.
    let destination = destination.to_string_lossy().to_string();
    let pool = pool(app).await?;
    sqlx::query("VACUUM INTO ?1")
        .bind(destination)
        .execute(&pool)
        .await
        .map_err(|error| {
            // A long-running `VACUUM` reader can lose the race with a writer on a
            // loaded till; that is retryable, not a broken install.
            log::error!("backup_data VACUUM INTO failed: {error}");
            let busy = error.to_string().contains("database is locked");
            if busy { DB_BUSY.to_string() } else { FAILED.to_string() }
        })?;
    Ok(())
}

/// Checks the snapshot before it is shipped, and answers its schema version.
///
/// Restoring a corrupt archive is the one failure a backup cannot recover from,
/// so the copy is verified while the original is still intact. `integrity_check`
/// is a full page scan: on the sizes this app sees it costs a second and buys the
/// difference between "the backup failed tonight" and "the backup was empty on the
/// night it was needed".
///
/// The snapshot is also switched to rollback-journal mode: the archive ships one
/// file with no `-wal` beside it, so a restore has nothing to replay and no sidecar
/// to recreate.
async fn verify_snapshot(snapshot: &Path) -> Result<Option<i64>, String> {
    let mut conn = SqliteConnectOptions::new()
        .filename(snapshot)
        .connect()
        .await
        .map_err(|error| {
            log::error!("backup_data could not open its own snapshot: {error}");
            FAILED.to_string()
        })?;

    let result = async {
        // `fetch_all`, not `execute`: the pragma answers with a row.
        sqlx::query("PRAGMA journal_mode = DELETE")
            .fetch_all(&mut conn)
            .await
            .map_err(|error| error.to_string())?;

        let rows: Vec<String> = sqlx::query_scalar("PRAGMA integrity_check")
            .fetch_all(&mut conn)
            .await
            .map_err(|error| error.to_string())?;
        if rows.len() != 1 || rows[0] != "ok" {
            return Err(format!("integrity_check: {rows:?}"));
        }

        let schema: Option<i64> = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
            .fetch_one(&mut conn)
            .await
            .map_err(|error| error.to_string())?;
        Ok(schema)
    }
    .await;

    // `close` is awaited even on failure: the connection holds the file open, and
    // the temp directory is removed right after this returns.
    let _ = conn.close().await;

    result.map_err(|detail| {
        log::error!("backup_data refused a snapshot: {detail}");
        CORRUPT.to_string()
    })
}

/// `manifest.json`: what the archive is, in a form a later restore can read.
///
/// Written now because it cannot be added later — archives already in a drawer
/// would never gain one. `version` and `schema` are what a restore needs to refuse
/// an archive from a different build instead of half-applying it, and the digests
/// are what tell a support workflow that the file arrived intact.
fn write_manifest(
    path: &Path,
    store_json: &str,
    schema: Option<i64>,
    snapshot: &Path,
    store_path: &Path,
) -> Result<(), String> {
    // The store is a flat key map, so the sync credential is the literal key.
    // Only a warning: the archive is the shop's own file, but its presence is the
    // difference between "safe to send to support" and "contains a login token".
    let contains_sync_token = serde_json::from_str::<Value>(store_json)
        .ok()
        .and_then(|value| value.get("sync.token").map(|token| !token.is_null()))
        .unwrap_or(false);

    let files = [
        ("data.db", "appConfig", snapshot),
        (STORE_FILE, "appData", store_path),
    ];
    let mut described = Vec::with_capacity(files.len());
    for (name, dir, file) in files {
        let bytes = fs::metadata(file)
            .map_err(|error| {
                log::error!("backup_data could not size {name}: {error}");
                FAILED.to_string()
            })?
            .len();
        described.push(json!({
            "name": name,
            "dir": dir,
            "bytes": bytes,
            "sha256": sha256_hex(file)?,
        }));
    }

    let manifest = json!({
        "app": "kassir",
        "version": env!("CARGO_PKG_VERSION"),
        "createdAt": chrono::Local::now().to_rfc3339(),
        "schema": schema,
        "containsSyncToken": contains_sync_token,
        "files": described,
    });
    let bytes = serde_json::to_vec_pretty(&manifest).map_err(|error| {
        log::error!("backup_data manifest serialisation failed: {error}");
        FAILED.to_string()
    })?;
    fs::write(path, bytes).map_err(|error| {
        log::error!("backup_data failed writing the manifest: {error}");
        FAILED.to_string()
    })
}

/// Compresses the payload into `<target>.part`, then moves it into place.
///
/// The rename is the last thing that happens, so the chosen name only ever exists
/// as a complete archive. A Windows `rename` will not replace an existing file, so
/// the target the cashier already confirmed overwriting is removed first — inside
/// the same task, after the archive is complete, so a failure leaves their previous
/// backup untouched.
async fn zip_into(
    target: &Path,
    payload: Vec<(String, PathBuf)>,
) -> Result<BackupSaved, String> {
    let mut part_name = target.as_os_str().to_owned();
    part_name.push(".part");
    let part = PathBuf::from(part_name);

    let part_for_task = part.clone();
    let written = tauri::async_runtime::spawn_blocking(move || -> Result<u64, String> {
        let file = fs::File::create(&part_for_task).map_err(|error| {
            log::error!("backup_data could not create {}: {error}", part_for_task.display());
            FAILED.to_string()
        })?;
        let mut zip = ZipWriter::new(file);
        // Level 6 is zlib's default: SQLite pages compress several times over and
        // the last two levels mostly cost CPU the cashier is waiting on.
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .compression_level(Some(6));

        for (name, source) in &payload {
            // Every entry is stored flat under its file name: the manifest carries
            // the destination, so the archive stays readable by hand (and by any
            // unzip tool) whatever a future restore decides.
            zip.start_file(name.as_str(), options).map_err(|error| {
                log::error!("backup_data could not add {name}: {error}");
                FAILED.to_string()
            })?;
            let mut reader = fs::File::open(source).map_err(|error| {
                log::error!("backup_data could not read {}: {error}", source.display());
                FAILED.to_string()
            })?;
            std::io::copy(&mut reader, &mut zip).map_err(|error| {
                log::error!("backup_data could not compress {name}: {error}");
                FAILED.to_string()
            })?;
        }

        zip.finish().map_err(|error| {
            log::error!("backup_data could not finish the archive: {error}");
            FAILED.to_string()
        })?;

        fs::metadata(&part_for_task)
            .map(|meta| meta.len())
            .map_err(|error| {
                log::error!("backup_data could not size the archive: {error}");
                FAILED.to_string()
            })
    })
    .await
    .map_err(|error| {
        log::error!("backup_data zip task failed: {error}");
        FAILED.to_string()
    })?
    .map_err(|error| {
        // A half-written `.part` in the cashier's folder would outlive the
        // failure otherwise, and look like a backup by name.
        let _ = fs::remove_file(&part);
        error
    })?;

    // The save dialog already asked about overwriting; on Windows the rename will
    // not do it for us.
    if let Err(error) = fs::remove_file(target) {
        if error.kind() != std::io::ErrorKind::NotFound {
            log::error!("backup_data could not replace {}: {error}", target.display());
            let _ = fs::remove_file(&part);
            return Err(FAILED.to_string());
        }
    }
    fs::rename(&part, target).map_err(|error| {
        log::error!("backup_data could not move the archive into place: {error}");
        let _ = fs::remove_file(&part);
        FAILED.to_string()
    })?;

    Ok(BackupSaved {
        path: target.display().to_string(),
        bytes: written,
    })
}

fn sha256_hex(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| {
        log::error!("backup_data could not hash {}: {error}", path.display());
        FAILED.to_string()
    })?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| {
            log::error!("backup_data could not hash {}: {error}", path.display());
            FAILED.to_string()
        })?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}
