//! The image optimizer (Pengaturan → Sistem → Gambar).
//!
//! Two things live here, and they are the same two facts: **a picture's bytes are
//! a file, and its name is a hash of those bytes** (`<sha256>.<ext>`).
//!
//! The naming is what makes deduplication fall out of storage instead of being a
//! pass of its own. Two identical pictures convert to identical bytes, so they
//! land on the same name; the second row simply points at the file the first one
//! wrote, and nothing has to pick a "master" or agree on one across devices. It
//! also makes the job resumable and its own retry: a row whose name already is the
//! hash of its file is finished, whatever interrupted the earlier attempt — and,
//! because the *name* carries that fact, a second pass over an optimized catalogue
//! costs a `stat` per picture instead of a read and a hash (`content_digest`).
//!
//! What the job does, per row, in the only order that cannot lose a picture:
//! convert and write the new file first, then point the row at it, then retire the
//! old file — and only if `refs.sql` says no live row names it any more. A crash
//! anywhere in that sequence leaves either the old picture (row not yet moved) or
//! both (old file not yet retired); never a row pointing at nothing.
//!
//! ## What it deliberately does not do
//!
//! * **No per-file zip.** WebP is already entropy-coded; deflating it returns
//!   nothing measurable and would cost a decompress on every read in
//!   `src/lib/image.ts`. The bytes are saved by the format and by the edge cap.
//! * **No re-encode of a WebP.** A second lossy pass costs quality forever. An
//!   oversized WebP is renamed to its hash and otherwise left alone.
//! * **No record pictures.** `record_images` is a child of an immutable record
//!   aggregate; rewriting its bytes invites a merge conflict on a sale that has
//!   already been rung up. Its rows still count in `refs.sql`, so a file a receipt
//!   shows is never swept up.
//!
//! `MAX_EDGE` and `QUALITY` are constants, not settings: two devices with
//! different values would keep re-encoding the same pictures at each other
//! through the sync, each pass bumping `image_updated_at` and losing quality.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::{Arc, Mutex};

use image::imageops::FilterType;
use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::{Row, SqlitePool};
use tauri::ipc::Channel;
use tauri::{command, AppHandle, Manager, Runtime};

use crate::database::pool;

/// `AppData/images`, the folder `src/lib/image.ts` writes the gallery into.
const IMAGES_DIR: &str = "images";

/// The scratch suffix a file is written under before its `rename`.
const PART_SUFFIX: &str = ".part";

/// The longest edge a stored picture keeps.
///
/// 1600 px is chosen for a receipt photographed at arm's length: the text stays
/// readable when the picture is zoomed, while a 12-megapixel phone shot (4000 px)
/// sheds most of its bytes. This is the dimension win that makes the format win
/// worth having, so the two are not separable.
const MAX_EDGE: u32 = 1600;

/// libwebp quality, 0–100.
const QUALITY: f32 = 80.0;

const WEBP: &str = "image/webp";

const FAILED: &str = "Gagal mengoptimalkan gambar. Coba lagi.";
const UNREADABLE: &str = "Gambar tidak dapat dibaca.";

/// How many live rows name one file. Shared with `src/services/image/live.ts`,
/// which is the release gate the delete paths use.
const REFS_SQL: &str = include_str!("../../src/services/image/refs.sql");

// ============================================================================
// State
// ============================================================================

#[derive(Default)]
pub struct ImageOptState {
    /// The running job's stop flag; `image_optimize_cancel` flips it.
    cancelled: Mutex<Option<Arc<AtomicBool>>>,
}

impl ImageOptState {
    fn register(&self) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        if let Ok(mut slot) = self.cancelled.lock() {
            *slot = Some(flag.clone());
        }
        flag
    }

    fn unregister(&self) {
        if let Ok(mut slot) = self.cancelled.lock() {
            *slot = None;
        }
    }
}

// ============================================================================
// Wire types
// ============================================================================

/// One progress frame.
///
/// `stage` is a keyword (`scan`, `convert`), not a sentence: the words live beside
/// the rest of the UI copy, the same split the sync phases and the backup stages
/// use. `percent` covers the whole job, and `balances` are the only measure of
/// success that means anything — how many bytes the folder holds now against how
/// many it held when the job started.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptProgress {
    pub stage: &'static str,
    pub percent: u8,
    pub done: u32,
    pub total: u32,
    pub bytes_before: u64,
    pub bytes_after: u64,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    pub total: u32,
    /// Every live picture's bytes on disk now.
    pub bytes: u64,
    /// Pictures this policy will re-encode (PNG/JPEG).
    pub convert: u32,
    pub convert_bytes: u64,
    /// WebP pictures whose name is not their hash yet: renamed, never re-encoded.
    pub rename: u32,
    /// Already content-addressed: nothing to do.
    pub optimal: u32,
    /// Rows whose file is not on this device (pulled from another till, or never
    /// downloaded). Not an error; the job leaves them alone.
    pub missing: u32,
    pub unreadable: u32,
    /// Rows whose bytes another row already holds — the dedupe, counted before it
    /// happens.
    pub duplicates: u32,
    pub duplicate_bytes: u64,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OptSummary {
    pub converted: u32,
    /// Content-addressed without re-encoding (an already-WebP picture).
    pub renamed: u32,
    /// Old files unlinked once nothing named them.
    pub reclaimed: u32,
    pub optimal: u32,
    pub missing: u32,
    pub failed: u32,
    pub bytes_before: u64,
    pub bytes_after: u64,
    pub cancelled: bool,
}

// ============================================================================
// Progress
// ============================================================================

#[derive(Clone)]
struct Reporter {
    channel: Channel<OptProgress>,
    percent: Arc<AtomicU8>,
}

impl Reporter {
    fn new(channel: Channel<OptProgress>) -> Self {
        Self {
            channel,
            percent: Arc::new(AtomicU8::new(0)),
        }
    }

    /// Reports `done`/`total` through the whole job.
    ///
    /// The bar only moves forward (`max` against the last value): a scan's leftovers
    /// must not rewind the convert stage.
    fn report(&self, stage: &'static str, done: u32, total: u32, before: u64, after: u64) {
        let fraction = if total == 0 {
            1.0
        } else {
            f64::from(done) / f64::from(total)
        };
        let next = (fraction * 100.0).round() as u8;
        let percent = next.min(100).max(self.percent.load(Ordering::Relaxed));
        self.percent.store(percent, Ordering::Relaxed);
        let _ = self.channel.send(OptProgress {
            stage,
            percent,
            done,
            total,
            bytes_before: before,
            bytes_after: after,
        });
    }
}

// ============================================================================
// Files
// ============================================================================

fn images_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|error| {
        log::error!("image optimizer: no app data dir: {error}");
        FAILED.to_string()
    })?;
    Ok(base.join(IMAGES_DIR))
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

/// The file extension a mime is stored under, or `None` for a type the gallery
/// cannot hold (`img_mimes` keeps that from happening, so this is a guard).
fn ext_of(mime: &str) -> Option<&'static str> {
    match mime {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        WEBP => Some("webp"),
        _ => None,
    }
}

/// The digest a file name already carries, when the name is one this module wrote:
/// `<64 lowercase hex>.<ext of its mime>`.
///
/// This is what makes a second visit cheap. The name is written *after* the bytes
/// are hashed, so a row that carries one is its own proof that it is finished —
/// re-reading and re-hashing every picture to prove it again is the cost this check
/// exists to avoid on a catalogue that was already optimized. Nothing else writes
/// `AppData/images/`: a name that is not of this shape is one the gallery minted
/// (`${image_id}-${original}`), and that row still has to be read.
fn content_digest<'a>(name: &'a str, mime: &str) -> Option<&'a str> {
    let ext = ext_of(mime)?;
    let (digest, found) = name.rsplit_once('.')?;
    let shaped = found == ext
        && digest.len() == 64
        && digest
            .bytes()
            .all(|byte| matches!(byte, b'0'..=b'9' | b'a'..=b'f'));
    if shaped {
        Some(digest)
    } else {
        None
    }
}

/// Counts one content key, reporting whether an earlier row already held it.
fn note_content(seen: &mut std::collections::HashMap<String, u32>, digest: &str) -> bool {
    let count = seen.entry(digest.to_string()).or_insert(0);
    let first = *count == 0;
    *count += 1;
    !first
}

/// Re-encodes a picture as WebP, capped at `MAX_EDGE` on the long edge.
///
/// `None` when there is nothing to try: an already-WebP picture is never handed
/// here, and a decode failure means the bytes are not a picture at all. Whether
/// the result is *worth* keeping (it can come out bigger on an already-tight
/// JPEG) is the caller's decision — it has the original size to compare against.
fn transcode(bytes: &[u8], mime: &str) -> Option<Vec<u8>> {
    if mime == WEBP {
        return None;
    }
    let source = image::load_from_memory(bytes).ok()?;

    let (width, height) = (source.width(), source.height());
    let longest = width.max(height);
    let scaled = if longest > MAX_EDGE {
        // `resize` keeps the aspect ratio; the target box is square at the cap, so
        // the long edge lands exactly on it and the short one follows.
        source.resize(MAX_EDGE, MAX_EDGE, FilterType::Lanczos3)
    } else {
        source
    };

    // Keep the channel count the picture already has: an alpha channel that is not
    // there costs bytes on every pixel of a photo.
    let encoded = if scaled.color().has_alpha() {
        let rgba = scaled.to_rgba8();
        let (width, height) = (rgba.width(), rgba.height());
        webp::Encoder::from_rgba(rgba.as_raw(), width, height).encode(QUALITY)
    } else {
        let rgb = scaled.to_rgb8();
        let (width, height) = (rgb.width(), rgb.height());
        webp::Encoder::from_rgb(rgb.as_raw(), width, height).encode(QUALITY)
    };
    Some(encoded.to_vec())
}

/// What one stored picture is, as the row must record it.
struct Stored {
    name: String,
    mime: String,
    bytes: u64,
}

/// Converts when that helps, then writes the bytes under their content-addressed
/// name and reports what to put in the row.
///
/// The name is the hash of the bytes that were actually written, so a second row
/// with identical content joins an existing file instead of writing a copy: the
/// dedupe needs no table of its own. The write is `part` + `rename`, so a crash
/// cannot leave a truncated file under a name that claims to describe it.
fn store_in(dir: &Path, bytes: &[u8], mime: &str) -> Result<Stored, String> {
    let converted = transcode(bytes, mime).filter(|out| out.len() < bytes.len());
    let (payload, chosen): (&[u8], &str) = match converted.as_deref() {
        Some(out) => (out, WEBP),
        None => (bytes, mime),
    };

    let ext = ext_of(chosen).ok_or_else(|| {
        log::warn!("image optimizer: unsupported mime {chosen}");
        UNREADABLE.to_string()
    })?;
    let name = format!("{}.{ext}", sha256_hex(payload));
    let target = dir.join(&name);

    if !target.exists() {
        let part = dir.join(format!("{name}{PART_SUFFIX}"));
        std::fs::write(&part, payload).map_err(|error| {
            log::error!(
                "image optimizer: could not write {}: {error}",
                part.display()
            );
            let _ = std::fs::remove_file(&part);
            FAILED.to_string()
        })?;
        std::fs::rename(&part, &target).map_err(|error| {
            log::error!(
                "image optimizer: could not publish {}: {error}",
                target.display()
            );
            let _ = std::fs::remove_file(&part);
            FAILED.to_string()
        })?;
    }

    Ok(Stored {
        name,
        mime: chosen.to_string(),
        bytes: payload.len() as u64,
    })
}

/// Unlinks `name` when no live row names it any more; reports whether it did.
async fn release(pool: &SqlitePool, dir: &Path, name: &str) -> Result<bool, String> {
    let refs: i64 = sqlx::query_scalar(REFS_SQL)
        .bind(name)
        .fetch_one(pool)
        .await
        .map_err(|error| {
            log::error!("image optimizer: could not count references to {name}: {error}");
            FAILED.to_string()
        })?;
    if refs > 0 {
        return Ok(false);
    }

    let path = dir.join(name);
    match std::fs::remove_file(&path) {
        Ok(()) => Ok(true),
        // Already gone: an earlier run retired it, or it never came down from the
        // server. Not an error, and not something to report as reclaimed.
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => {
            log::error!(
                "image optimizer: could not remove {}: {error}",
                path.display()
            );
            Err(FAILED.to_string())
        }
    }
}

// ============================================================================
// Rows
// ============================================================================

struct ImageRow {
    image_id: String,
    name: String,
    mime: String,
}

async fn live_rows(pool: &SqlitePool) -> Result<Vec<ImageRow>, String> {
    let rows = sqlx::query(
        "SELECT image_id, image_name, image_mime FROM images
          WHERE image_deleted_at IS NULL
          ORDER BY product_id, image_order, image_id",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| {
        log::error!("image optimizer: could not list images: {error}");
        FAILED.to_string()
    })?;

    Ok(rows
        .iter()
        .map(|row| ImageRow {
            image_id: row.get("image_id"),
            name: row.get("image_name"),
            mime: row.get("image_mime"),
        })
        .collect())
}

/// Points one row at the picture now on disk.
///
/// The clock and `image_blob_version` move together and the two blob markers are
/// cleared: these are bytes this device just produced, so the uploader has to
/// carry them to the server for the new version (§8.7.1). `image_sync_at = NULL`
/// is what makes the renamed row dirty, so the next push sends it at all.
async fn retarget(
    pool: &SqlitePool,
    image_id: &str,
    stored: &Stored,
    now: i64,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE images SET
           image_name = $1,
           image_mime = $2,
           image_updated_at = max($3, image_updated_at + 1),
           image_blob_version = max($3, image_updated_at + 1),
           image_blob_sha256 = NULL,
           image_blob_sync_at = NULL,
           image_sync_at = NULL
         WHERE image_id = $4",
    )
    .bind(&stored.name)
    .bind(&stored.mime)
    .bind(now)
    .bind(image_id)
    .execute(pool)
    .await
    .map_err(|error| {
        log::error!("image optimizer: could not retarget {image_id}: {error}");
        FAILED.to_string()
    })?;
    Ok(())
}

// ============================================================================
// Commands
// ============================================================================

/// What the job would do, without doing any of it.
///
/// Reads and hashes every picture, because "is this file already named by its
/// hash" and "does another row hold these bytes" are both questions about content.
/// Nothing is written, converted or deleted.
#[command]
pub async fn image_optimize_plan<R: Runtime>(
    app: AppHandle<R>,
    on_progress: Channel<OptProgress>,
) -> Result<Plan, String> {
    let pool = pool(&app).await?;
    let dir = images_dir(&app)?;
    let rows = live_rows(&pool).await?;
    let total = rows.len() as u32;
    let reporter = Reporter::new(on_progress);
    reporter.report("scan", 0, total, 0, 0);

    let mut plan = Plan::default();
    let mut seen: std::collections::HashMap<String, u32> = std::collections::HashMap::new();

    for (index, row) in rows.iter().enumerate() {
        plan.total += 1;
        let path = dir.join(&row.name);

        // A stat is enough to size a picture; only a row that is not finished needs
        // its bytes read (`content_digest` explains why).
        let size = match std::fs::metadata(&path) {
            Ok(meta) => meta.len(),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                plan.missing += 1;
                reporter.report("scan", index as u32 + 1, total, 0, 0);
                continue;
            }
            Err(error) => {
                log::warn!(
                    "image optimizer: could not size {}: {error}",
                    path.display()
                );
                plan.unreadable += 1;
                reporter.report("scan", index as u32 + 1, total, 0, 0);
                continue;
            }
        };
        plan.bytes += size;

        if let Some(digest) = content_digest(&row.name, &row.mime) {
            plan.optimal += 1;
            if note_content(&mut seen, digest) {
                plan.duplicates += 1;
                plan.duplicate_bytes += size;
            }
            reporter.report("scan", index as u32 + 1, total, 0, 0);
            continue;
        }

        let bytes = match std::fs::read(&path) {
            Ok(bytes) => bytes,
            Err(error) => {
                log::warn!(
                    "image optimizer: could not read {}: {error}",
                    path.display()
                );
                plan.unreadable += 1;
                reporter.report("scan", index as u32 + 1, total, 0, 0);
                continue;
            }
        };
        let digest = sha256_hex(&bytes);
        if row.mime == WEBP {
            plan.rename += 1;
        } else {
            plan.convert += 1;
            plan.convert_bytes += size;
        }
        if note_content(&mut seen, &digest) {
            plan.duplicates += 1;
            plan.duplicate_bytes += size;
        }
        reporter.report("scan", index as u32 + 1, total, 0, 0);
    }
    Ok(plan)
}

/// The name and type a freshly written pick ended up with.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Adopted {
    pub name: String,
    pub mime: String,
}

/// Takes an unreferenced file the webview just wrote and makes it the stored
/// picture: converted if that helps, named by its content, source removed.
///
/// This is the upload path of the optimizer — `image.save` in `src/lib/image.ts`
/// writes the picked bytes under a draft name first (the fs plugin moves them as
/// raw bytes, which the IPC cannot), then calls this, and commits the row with the
/// name that comes back. From that moment the row, the file and the name agree.
///
/// The source is removed through `release`, the same refcount the delete paths use,
/// so a name that somehow is still referenced keeps its file: the cost of that
/// mistake is a copy on disk, not a broken picture.
#[command]
pub async fn image_adopt<R: Runtime>(
    app: AppHandle<R>,
    name: String,
    mime: String,
) -> Result<Adopted, String> {
    let dir = images_dir(&app)?;
    if crate::sync_blob::safe_file_name(&name).is_none() {
        return Err(UNREADABLE.to_string());
    }
    let path = dir.join(&name);
    let bytes = std::fs::read(&path).map_err(|error| {
        log::warn!("image adopt: could not read {}: {error}", path.display());
        UNREADABLE.to_string()
    })?;

    let stored = match store_in(&dir, &bytes, &mime) {
        Ok(stored) => stored,
        Err(error) => {
            // Nothing points at the draft yet, so a failed adopt leaves no orphan.
            let _ = std::fs::remove_file(&path);
            return Err(error);
        }
    };

    if stored.name != name {
        let pool = pool(&app).await?;
        match release(&pool, &dir, &name).await {
            Ok(_) => {}
            // The picture is stored and named; a source that will not unlink is an
            // orphan on disk, not a failed save.
            Err(error) => log::warn!("image adopt: {error}"),
        }
    }

    Ok(Adopted {
        name: stored.name,
        mime: stored.mime,
    })
}

/// Runs the job: convert, content-address, dedupe, retire.
///
/// Cancellation is checked between pictures, never inside one: a picture's four
/// steps are the atomic unit that keeps a row from pointing at nothing.
#[command]
pub async fn image_optimize_run<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ImageOptState>,
    on_progress: Channel<OptProgress>,
) -> Result<OptSummary, String> {
    let cancel = state.register();
    let outcome = run(&app, on_progress, &cancel).await;
    state.unregister();
    outcome
}

/// Stops a running `image_optimize_run`. Not an error: the command returns
/// `OptSummary { cancelled: true }`.
#[command]
pub fn image_optimize_cancel(state: tauri::State<'_, ImageOptState>) -> Result<(), String> {
    if let Ok(slot) = state.cancelled.lock() {
        if let Some(flag) = slot.as_ref() {
            flag.store(true, Ordering::SeqCst);
        }
    }
    Ok(())
}

async fn run<R: Runtime>(
    app: &AppHandle<R>,
    on_progress: Channel<OptProgress>,
    cancel: &Arc<AtomicBool>,
) -> Result<OptSummary, String> {
    let pool = pool(app).await?;
    let dir = images_dir(app)?;
    let rows = live_rows(&pool).await?;
    let total = rows.len() as u32;
    let reporter = Reporter::new(on_progress);

    // One clock for the whole job. `max(now, image_updated_at + 1)` in the update
    // keeps it ahead of a row that was already stamped later than this.
    let now = chrono::Utc::now().timestamp_millis();
    let mut summary = OptSummary::default();
    reporter.report("convert", 0, total, 0, 0);

    for (index, row) in rows.iter().enumerate() {
        if cancel.load(Ordering::SeqCst) {
            summary.cancelled = true;
            break;
        }

        let path = dir.join(&row.name);
        let size = match std::fs::metadata(&path) {
            Ok(meta) => meta.len(),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                summary.missing += 1;
                reporter.report(
                    "convert",
                    index as u32 + 1,
                    total,
                    summary.bytes_before,
                    summary.bytes_after,
                );
                continue;
            }
            Err(error) => {
                log::warn!(
                    "image optimizer: could not size {}: {error}",
                    path.display()
                );
                summary.failed += 1;
                reporter.report(
                    "convert",
                    index as u32 + 1,
                    total,
                    summary.bytes_before,
                    summary.bytes_after,
                );
                continue;
            }
        };
        summary.bytes_before += size;

        // Finished already: the name is the digest of the bytes, so there is
        // nothing to read it for.
        if content_digest(&row.name, &row.mime).is_some() {
            summary.optimal += 1;
            summary.bytes_after += size;
            reporter.report(
                "convert",
                index as u32 + 1,
                total,
                summary.bytes_before,
                summary.bytes_after,
            );
            continue;
        }

        let bytes = match std::fs::read(&path) {
            Ok(bytes) => bytes,
            Err(error) => {
                log::warn!(
                    "image optimizer: could not read {}: {error}",
                    path.display()
                );
                summary.failed += 1;
                reporter.report(
                    "convert",
                    index as u32 + 1,
                    total,
                    summary.bytes_before,
                    summary.bytes_after,
                );
                continue;
            }
        };

        // The decode and encode are the only real CPU in the job, and a 12-megapixel
        // photo is a fraction of a second of it: on a worker thread, so the cart's
        // flush timer and the sync are not stuck behind the optimizer.
        let work_dir = dir.clone();
        let work_mime = row.mime.clone();
        let stored =
            tauri::async_runtime::spawn_blocking(move || store_in(&work_dir, &bytes, &work_mime))
                .await
                .map_err(|error| {
                    log::error!("image optimizer: worker failed: {error}");
                    FAILED.to_string()
                })??;

        summary.bytes_after += stored.bytes;

        if let Err(error) = retarget(&pool, &row.image_id, &stored, now).await {
            // The row still points at the old picture, which is still on disk, so
            // the only damage is a stray new file. Count it and keep going.
            log::error!(
                "image optimizer: {} left unretargeted: {error}",
                row.image_id
            );
            summary.failed += 1;
            reporter.report(
                "convert",
                index as u32 + 1,
                total,
                summary.bytes_before,
                summary.bytes_after,
            );
            continue;
        }

        if stored.mime == WEBP && row.mime != WEBP {
            summary.converted += 1;
        } else {
            summary.renamed += 1;
        }

        match release(&pool, &dir, &row.name).await {
            Ok(true) => summary.reclaimed += 1,
            Ok(false) => {}
            // The row is already moved; a file that will not unlink is an orphan on
            // disk, not a failure of the job.
            Err(error) => log::warn!("image optimizer: {error}"),
        }

        reporter.report(
            "convert",
            index as u32 + 1,
            total,
            summary.bytes_before,
            summary.bytes_after,
        );
    }

    reporter.report(
        "convert",
        total,
        total,
        summary.bytes_before,
        summary.bytes_after,
    );
    log::info!(
        "image optimizer: {} converted, {} renamed, {} reclaimed, {} failed, {} bytes -> {} bytes{}",
        summary.converted,
        summary.renamed,
        summary.reclaimed,
        summary.failed,
        summary.bytes_before,
        summary.bytes_after,
        if summary.cancelled { " (cancelled)" } else { "" }
    );
    Ok(summary)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A PNG of `width` × `height` pixels. The gradient makes it compress the way
    /// a photograph does (tens of bytes per pixel is what a *flat* block avoids),
    /// so a resize and a WebP encode both have real work to do.
    fn png(width: u32, height: u32) -> Vec<u8> {
        let pixels = image::RgbImage::from_fn(width, height, |x, y| {
            image::Rgb([
                (x % 256) as u8,
                (y % 256) as u8,
                ((x.wrapping_mul(7) ^ y) % 256) as u8,
            ])
        });
        let mut out = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgb8(pixels)
            .write_to(&mut out, image::ImageFormat::Png)
            .expect("encode the fixture");
        out.into_inner()
    }

    fn files(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = std::fs::read_dir(dir)
            .expect("read the images directory")
            .map(|entry| {
                entry
                    .expect("entry")
                    .file_name()
                    .to_string_lossy()
                    .to_string()
            })
            .collect();
        names.sort();
        names
    }

    #[test]
    fn hash_is_the_plain_sha256_of_the_bytes() {
        // The empty string's digest: a value nobody has to take on trust.
        assert_eq!(
            sha256_hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn ext_covers_the_three_types_the_gallery_holds() {
        assert_eq!(ext_of("image/png"), Some("png"));
        assert_eq!(ext_of("image/jpeg"), Some("jpg"));
        assert_eq!(ext_of(WEBP), Some("webp"));
        assert_eq!(ext_of("image/gif"), None);
    }

    #[test]
    fn a_picture_is_named_by_the_bytes_that_were_written() {
        let dir = tempfile::tempdir().expect("tempdir");
        let stored = store_in(dir.path(), b"already webp", WEBP).expect("store");

        // WebP is never re-encoded, so the bytes are untouched and the name is
        // their digest under the extension that mime implies.
        assert_eq!(stored.name, format!("{}.webp", sha256_hex(b"already webp")));
        assert_eq!(stored.mime, WEBP);
        assert_eq!(stored.bytes, 12);
        assert_eq!(files(dir.path()), vec![stored.name.clone()]);
        assert_eq!(
            std::fs::read(dir.path().join(&stored.name)).expect("read"),
            b"already webp"
        );
    }

    #[test]
    fn identical_content_lands_on_one_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let bytes = png(64, 64);

        let first = store_in(dir.path(), &bytes, "image/png").expect("first");
        let second = store_in(dir.path(), &bytes, "image/png").expect("second");

        assert_eq!(first.name, second.name);
        assert_eq!(files(dir.path()).len(), 1, "the second row joins the file");
        assert!(
            !files(dir.path())[0].ends_with(PART_SUFFIX),
            "no part left behind"
        );
    }

    #[test]
    fn a_photograph_is_capped_on_its_long_edge() {
        let source = png(3000, 20);
        let converted = transcode(&source, "image/png").expect("png converts");

        let decoded = image::load_from_memory(&converted).expect("the output decodes");
        assert_eq!(decoded.width(), MAX_EDGE);
        // 20 px on a 3000 px edge is 10.6: rounding up keeps it visible.
        assert!(decoded.height() <= 12, "height was {}", decoded.height());
    }

    #[test]
    fn only_a_name_this_module_wrote_reads_as_finished() {
        let digest = sha256_hex(b"picture");

        // The shape this module writes: the digest, and the extension its mime
        // implies.
        assert_eq!(
            content_digest(&format!("{digest}.webp"), WEBP),
            Some(digest.as_str())
        );
        assert_eq!(
            content_digest(&format!("{digest}.png"), "image/png"),
            Some(digest.as_str())
        );

        // Anything else still owes a read: a name the gallery minted, the wrong
        // extension, a truncated digest, a type the gallery cannot hold.
        assert_eq!(content_digest("3f2a-rumah.webp", WEBP), None);
        assert_eq!(content_digest(&format!("{digest}.png"), WEBP), None);
        assert_eq!(
            content_digest(&format!("{}.webp", &digest[1..]), WEBP),
            None
        );
        assert_eq!(content_digest(&format!("{digest}.png"), "image/gif"), None);
    }

    #[test]
    fn a_webp_is_never_re_encoded() {
        let bytes = png(64, 64);
        assert!(transcode(&bytes, WEBP).is_none());
    }
}
