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
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{ConnectOptions, Connection, SqlitePool};

use crate::database::pool;
use tauri::ipc::Channel;
use tauri::{command, Runtime};
use tauri_plugin_dialog::DialogExt;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

/// The store file, as `src/services/store/live.ts` names it. It resolves under
/// `app_data_dir`, while `data.db` resolves under `app_config_dir` — two
/// different directories, which is why the manifest records where each file
/// belongs instead of the restore path being guessed.
const STORE_FILE: &str = "store.json";

const FAILED: &str = "Gagal membuat cadangan. Coba pilih folder lain.";
const DB_BUSY: &str = "Database sibuk. Coba lagi sebentar lagi.";
const CORRUPT: &str = "Cadangan gagal diperiksa dan tidak disimpan. Coba lagi.";

// The cycle's slices, in percent. Four of the five stages read the whole database
// (snapshot copies it, then verify, hash and compress each read it once), so the
// slices follow the work rather than the number of stages — the snapshot gets the
// largest one because it is the only stage that both reads and writes every page.
// A guess is fine here: the bar's job is to answer "is it still working?", and it
// is monotonic, so a slice that turns out too small costs accuracy, never truth.
const SNAPSHOT_END: u8 = 35;
const VERIFY_END: u8 = 50;
const HASH_END: u8 = 62;
const COMPRESS_END: u8 = 96;

/// How often the snapshot's growing file is measured. Fast enough that the bar
/// moves visibly, slow enough that a `stat` per 150 ms is noise beside the copy.
const POLL: Duration = Duration::from_millis(150);

/// One progress frame.
///
/// `stage` is a keyword, not a sentence: the words live beside the rest of the UI
/// copy (`BackupData.tsx`), the same split the sync phases use. `percent` covers
/// the whole cycle, not the stage, so the bar fills once instead of restarting
/// five times — a bar that empties when a stage changes reads as failing rather
/// than working.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupProgress {
    pub stage: &'static str,
    pub percent: u8,
}

/// The one bar's state, shared between the thread that polls the snapshot and the
/// thread that compresses.
///
/// `percent` is an atomic and only ever moves forward (`report` takes the max), so
/// a late report from a stage that has already finished cannot make the bar jump
/// back. `stage` is behind a mutex because a caption is not monotonic in the same
/// way: it changes exactly when a stage starts.
#[derive(Clone)]
struct Reporter {
    channel: Channel<BackupProgress>,
    percent: Arc<AtomicU8>,
    stage: Arc<Mutex<&'static str>>,
}

impl Reporter {
    fn new(channel: Channel<BackupProgress>) -> Self {
        Self {
            channel,
            percent: Arc::new(AtomicU8::new(0)),
            stage: Arc::new(Mutex::new("snapshot")),
        }
    }

    /// Reports `fraction` (0…1) of the way through `stage`, whose slice of the
    /// cycle is `from`…`to` percent.
    fn report(&self, stage: &'static str, from: u8, to: u8, fraction: f64) {
        let fraction = fraction.clamp(0.0, 1.0);
        let span = f64::from(to.saturating_sub(from));
        let next = (f64::from(from) + span * fraction).round() as u8;
        // Never backwards: a poll that lands after the stage ended must not rewind.
        let percent = next.min(100).max(self.percent.load(Ordering::Relaxed));
        let previous = self.percent.swap(percent, Ordering::Relaxed);

        let entered = match self.stage.lock() {
            Ok(mut current) if *current != stage => {
                *current = stage;
                true
            }
            // A poisoned lock means a panic on another thread; keep reporting the
            // bar rather than failing a backup over the caption.
            Ok(_) => false,
            Err(_) => true,
        };

        if entered || previous != percent {
            let _ = self.channel.send(BackupProgress { stage, percent });
        }
    }
}

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
/// `on_progress` carries one bar for the whole cycle: the dialog is the cashier's
/// own time (no frames are sent while it is open), and from `snapshot` to
/// `finalize` every frame moves the same bar forward.
///
/// `Ok(None)` means the save dialog was cancelled: nothing was written, and the
/// caller must not report success.
#[command]
pub async fn backup_data<R: Runtime>(
    app: tauri::AppHandle<R>,
    on_progress: Channel<BackupProgress>,
    store_json: String,
) -> Result<Option<BackupSaved>, String> {
    let Some(target) = ask_where(&app).await? else {
        return Ok(None);
    };

    // Stage timings are logged, not shown: 15 s is either the database or the CPU
    // and there is no way to tell them apart from the outside.
    let started = Instant::now();
    let reporter = Reporter::new(on_progress);

    // The snapshot needs a second copy of the database on disk while it exists,
    // so it lives in the OS temp directory rather than next to the user's file:
    // a failed backup should not leave a stray `data.db` in Documents.
    let dir = tempfile::tempdir().map_err(|error| {
        log::error!("backup_data tempdir failed: {error}");
        FAILED.to_string()
    })?;

    let snapshot = dir.path().join("data.db");
    let at = Instant::now();
    vacuum_into(&app, &snapshot, &reporter).await?;
    log::info!("backup: snapshot in {} ms", at.elapsed().as_millis());

    let at = Instant::now();
    let schema = verify_snapshot(&snapshot, &reporter).await?;
    log::info!("backup: verify in {} ms", at.elapsed().as_millis());

    let store_path = dir.path().join(STORE_FILE);
    fs::write(&store_path, store_json.as_bytes()).map_err(|error| {
        log::error!("backup_data failed writing the store copy: {error}");
        FAILED.to_string()
    })?;

    let at = Instant::now();
    let files = describe_files(
        &reporter,
        &[
            ("data.db", "appConfig", &snapshot),
            (STORE_FILE, "appData", &store_path),
        ],
    )?;
    log::info!("backup: hash in {} ms", at.elapsed().as_millis());

    let manifest_path = dir.path().join("manifest.json");
    write_manifest(&manifest_path, &files, schema, &store_json)?;

    let payload = vec![files[0].path.clone(), files[1].path.clone(), manifest_path];
    let at = Instant::now();
    let archive = zip_into(&target, payload, &reporter).await?;
    log::info!("backup: compress in {} ms", at.elapsed().as_millis());

    reporter.report("finalize", COMPRESS_END, 100, 1.0);
    log::info!("backup: done in {} ms", started.elapsed().as_millis());

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

/// Writes a consistent snapshot of the live database to `destination`.
async fn vacuum_into<R: Runtime>(
    app: &tauri::AppHandle<R>,
    destination: &Path,
    reporter: &Reporter,
) -> Result<(), String> {
    reporter.report("snapshot", 0, SNAPSHOT_END, 0.0);
    let pool = pool(app).await?;
    let expected = expected_bytes(&pool).await;

    // `VACUUM INTO` reports nothing while it runs, but the file it writes grows
    // page by page, so its size against the source's logical size is the only
    // honest measure available without an API SQLite does not offer. The estimate
    // runs high when the vacuum drops free pages; the clamp and the stage's own
    // final report absorb that.
    let done = Arc::new(AtomicBool::new(false));
    let poller = {
        let done = Arc::clone(&done);
        let reporter = reporter.clone();
        let path = destination.to_path_buf();
        tauri::async_runtime::spawn_blocking(move || {
            while !done.load(Ordering::Relaxed) {
                std::thread::sleep(POLL);
                if done.load(Ordering::Relaxed) {
                    break;
                }
                let written = fs::metadata(&path).map(|meta| meta.len()).unwrap_or(0);
                let fraction = if expected == 0 {
                    0.0
                } else {
                    written as f64 / expected as f64
                };
                reporter.report("snapshot", 0, SNAPSHOT_END, fraction);
            }
        })
    };

    // `VACUUM INTO` refuses to overwrite, which is what makes it safe to point at
    // a path inside a fresh temp dir.
    let destination = destination.to_string_lossy().to_string();
    let result = sqlx::query("VACUUM INTO ?1")
        .bind(destination)
        .execute(&pool)
        .await;

    // The poller is awaited before the next stage reports: a frame that arrived
    // after verify started would move the caption back to "snapshot".
    done.store(true, Ordering::Relaxed);
    let _ = poller.await;

    result.map_err(|error| {
        // A long-running `VACUUM` reader can lose the race with a writer on a
        // loaded till; that is retryable, not a broken install.
        log::error!("backup_data VACUUM INTO failed: {error}");
        let busy = error.to_string().contains("database is locked");
        if busy {
            DB_BUSY.to_string()
        } else {
            FAILED.to_string()
        }
    })?;
    reporter.report("snapshot", 0, SNAPSHOT_END, 1.0);
    Ok(())
}

/// The snapshot's expected size: the source's logical size in bytes, WAL included
/// (which is why it is `page_count × page_size` rather than the file's length).
async fn expected_bytes(pool: &SqlitePool) -> u64 {
    let pages: Option<i64> = sqlx::query_scalar("PRAGMA page_count")
        .fetch_one(pool)
        .await
        .ok();
    let page_size: Option<i64> = sqlx::query_scalar("PRAGMA page_size")
        .fetch_one(pool)
        .await
        .ok();
    match (pages, page_size) {
        (Some(pages), Some(page_size)) => pages.max(0) as u64 * page_size.max(0) as u64,
        _ => 0,
    }
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
async fn verify_snapshot(snapshot: &Path, reporter: &Reporter) -> Result<Option<i64>, String> {
    reporter.report("verify", SNAPSHOT_END, VERIFY_END, 0.0);
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

    if result.is_ok() {
        reporter.report("verify", SNAPSHOT_END, VERIFY_END, 1.0);
    }

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
    files: &[ManifestFile],
    schema: Option<i64>,
    store_json: &str,
) -> Result<(), String> {
    // The store is a flat key map, so the sync credential is the literal key.
    // Only a warning: the archive is the shop's own file, but its presence is the
    // difference between "safe to send to support" and "contains a login token".
    let contains_sync_token = serde_json::from_str::<Value>(store_json)
        .ok()
        .and_then(|value| value.get("sync.token").map(|token| !token.is_null()))
        .unwrap_or(false);

    let described: Vec<Value> = files
        .iter()
        .map(|file| {
            json!({
                "name": file.name,
                "dir": file.dir,
                "bytes": file.bytes,
                "sha256": file.sha256,
            })
        })
        .collect();

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
    payload: Vec<PathBuf>,
    reporter: &Reporter,
) -> Result<BackupSaved, String> {
    let mut part_name = target.as_os_str().to_owned();
    part_name.push(".part");
    let part = PathBuf::from(part_name);

    // The bar tracks the bytes going *in*, since the archive's own size is only
    // known once the last entry is flushed.
    let mut total = 0_u64;
    for source in &payload {
        total += fs::metadata(source)
            .map_err(|error| {
                log::error!("backup_data could not size {}: {error}", source.display());
                FAILED.to_string()
            })?
            .len();
    }
    reporter.report("compress", HASH_END, COMPRESS_END, 0.0);

    let part_for_task = part.clone();
    let reporter = reporter.clone();
    let written = tauri::async_runtime::spawn_blocking(move || -> Result<u64, String> {
        let file = fs::File::create(&part_for_task).map_err(|error| {
            log::error!(
                "backup_data could not create {}: {error}",
                part_for_task.display()
            );
            FAILED.to_string()
        })?;
        let mut zip = ZipWriter::new(file);
        // Level 6 is zlib's default: SQLite pages compress several times over and
        // the last two levels mostly cost CPU the cashier is waiting on.
        let options = SimpleFileOptions::default()
            .compression_method(CompressionMethod::Deflated)
            .compression_level(Some(6));

        let mut done = 0_u64;
        for source in &payload {
            // Every entry is stored flat under its file name: the manifest carries
            // the destination, so the archive stays readable by hand (and by any
            // unzip tool) whatever a future restore decides.
            let name = source
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default();
            zip.start_file(name.as_str(), options).map_err(|error| {
                log::error!("backup_data could not add {name}: {error}");
                FAILED.to_string()
            })?;

            let file = fs::File::open(source).map_err(|error| {
                log::error!("backup_data could not read {}: {error}", source.display());
                FAILED.to_string()
            })?;

            // The read count is observed inside the reader because `io::copy` is a
            // black box; the offset of the entries before this one is added here.
            let read_here = {
                let mut on_read = |bytes: u64| {
                    reporter.report(
                        "compress",
                        HASH_END,
                        COMPRESS_END,
                        (done as f64 + bytes as f64) / total as f64,
                    );
                };
                let mut reader = CountingReader {
                    inner: file,
                    read: 0,
                    on_read: &mut on_read,
                };
                std::io::copy(&mut reader, &mut zip).map_err(|error| {
                    log::error!("backup_data could not compress {name}: {error}");
                    FAILED.to_string()
                })?;
                reader.read
            };
            done += read_here;
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
    .inspect_err(|_| {
        // A half-written `.part` in the cashier's folder would outlive the
        // failure otherwise, and look like a backup by name.
        let _ = fs::remove_file(&part);
    })?;

    // The save dialog already asked about overwriting; on Windows the rename will
    // not do it for us.
    if let Err(error) = fs::remove_file(target) {
        if error.kind() != std::io::ErrorKind::NotFound {
            log::error!(
                "backup_data could not replace {}: {error}",
                target.display()
            );
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

fn sha256_hex(path: &Path, on_read: &mut dyn FnMut(u64)) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| {
        log::error!("backup_data could not hash {}: {error}", path.display());
        FAILED.to_string()
    })?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    let mut total = 0_u64;
    loop {
        let read = file.read(&mut buffer).map_err(|error| {
            log::error!("backup_data could not hash {}: {error}", path.display());
            FAILED.to_string()
        })?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        total += read as u64;
        on_read(total);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}

/// One payload file as the manifest records it.
struct ManifestFile {
    name: &'static str,
    /// Which app directory a restore puts it back into: `data.db` lives under
    /// `app_config_dir`, `store.json` under `app_data_dir`.
    dir: &'static str,
    path: PathBuf,
    bytes: u64,
    sha256: String,
}

/// Sizes and digests for the payload, reported as the hash stage's progress.
fn describe_files(
    reporter: &Reporter,
    files: &[(&'static str, &'static str, &Path)],
) -> Result<Vec<ManifestFile>, String> {
    let total: u64 = files
        .iter()
        .map(|(name, _, path)| {
            fs::metadata(path).map(|meta| meta.len()).map_err(|error| {
                log::error!("backup_data could not size {name}: {error}");
                FAILED.to_string()
            })
        })
        .collect::<Result<Vec<u64>, String>>()?
        .into_iter()
        .sum();

    let mut done = 0_u64;
    let mut described = Vec::with_capacity(files.len());
    for (name, dir, path) in files {
        let bytes = fs::metadata(path)
            .map_err(|error| {
                log::error!("backup_data could not size {name}: {error}");
                FAILED.to_string()
            })?
            .len();
        // The closure is scoped so its borrow of `done` ends before `done` is
        // advanced — the offset is what makes the bar continuous across files.
        let sha256 = {
            let mut on_read = |read: u64| {
                reporter.report(
                    "hash",
                    VERIFY_END,
                    HASH_END,
                    (done as f64 + read as f64) / total as f64,
                );
            };
            sha256_hex(path, &mut on_read)?
        };
        done += bytes;
        described.push(ManifestFile {
            name,
            dir,
            path: path.to_path_buf(),
            bytes,
            sha256,
        });
    }
    reporter.report("hash", VERIFY_END, HASH_END, 1.0);
    Ok(described)
}

/// A reader that reports how many bytes it has handed out.
///
/// `std::io::copy` is a black box, so progress has to be observed at the reader
/// rather than in the loop. The callback receives the cumulative count for this
/// file; the caller adds the offset of the files before it.
struct CountingReader<'a, R> {
    inner: R,
    read: u64,
    on_read: &'a mut dyn FnMut(u64),
}

impl<R: Read> Read for CountingReader<'_, R> {
    fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
        let read = self.inner.read(buffer)?;
        self.read += read as u64;
        (self.on_read)(self.read);
        Ok(read)
    }
}
