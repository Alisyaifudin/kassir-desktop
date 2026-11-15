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
//! `MAX_EDGE` and `QUALITY` are constants, not settings — for a reason that
//! changed once the name became the content. A per-device policy would split the
//! namespace: the same photo converts to different bytes on two devices, lands on
//! two names, and both are uploaded and kept. And because the fast path trusts the
//! name (`content_digest`), a *changed* policy cannot touch what is already stored:
//! old pictures keep the bytes the old policy produced and only new picks follow the
//! new one. A policy change is therefore expressible only as a new name namespace
//! (`v1-<hash>.<ext>`), never as a setting — and until there is one, the constants
//! stay constants so the choice cannot silently diverge per till.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

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

/// How long a file must sit unreferenced before the sweep may unlink it.
///
/// A stored picture becomes referenced only when its caller's row commits: `store_in`
/// writes the file and answers the name first, and the commit lands after — for a
/// ten-draft batch, one commit after ten files. Zero references is therefore a
/// *momentary* state for a picture being saved right now, and a sweep that believed
/// the count alone would delete what the operator is looking at and leave the commit
/// pointing at nothing. Fifteen minutes is far longer than any save and far shorter
/// than "leftover for a day".
const ORPHAN_GRACE: Duration = Duration::from_secs(15 * 60);

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
/// A second job was asked for while one was running.
const BUSY: &str = "Optimasi lain sedang berjalan. Tunggu sampai selesai.";
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
    ///
    /// One slot, because the screen is one job: the run and the integrity pass are
    /// separate buttons and separate mutations, so nothing in the frontend stops
    /// both being pressed, and a second `register` would silently steal the first
    /// job's cancel — leaving a button that stops the wrong work, or nothing at all
    /// once the other job's `unregister` clears the slot underneath it. So the slot
    /// is a lock: a second job is refused with a sentence rather than started.
    cancelled: Mutex<Option<Arc<AtomicBool>>>,
}

impl ImageOptState {
    /// Claims the slot, or `None` when a job is already running.
    fn register(&self) -> Option<Arc<AtomicBool>> {
        let mut slot = self.cancelled.lock().ok()?;
        if slot.is_some() {
            return None;
        }
        let flag = Arc::new(AtomicBool::new(false));
        *slot = Some(flag.clone());
        Some(flag)
    }

    /// Releases the slot, but only for the job that still owns it: a job that
    /// returns after something else took over must not cancel the new owner's
    /// arrival by clearing its flag.
    fn unregister(&self, flag: &Arc<AtomicBool>) {
        if let Ok(mut slot) = self.cancelled.lock() {
            let owns = slot
                .as_ref()
                .is_some_and(|current| Arc::ptr_eq(current, flag));
            if owns {
                *slot = None;
            }
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
    /// Pictures this policy would re-encode (PNG/JPEG). A candidate is not a
    /// promise: whether WebP comes out smaller is only known by encoding, and
    /// `store_in` keeps the original when it did not.
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
    /// Files on disk that no live row names: what a failed retarget, a crash
    /// between write and commit, or a delete path that never freed its file leaves
    /// behind. `run` unlinks them.
    pub orphans: u32,
    pub orphan_bytes: u64,
    /// `.part` scratch files an interrupted write left behind. Never a picture's
    /// name, so they are swept whatever the refcount says.
    pub parts: u32,
    pub part_bytes: u64,
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
    /// Leftover files the sweep unlinked: orphans and stale `.part` scratch.
    pub orphans_reclaimed: u32,
    pub orphan_bytes: u64,
    pub parts_reclaimed: u32,
    pub part_bytes: u64,
    /// The pictures the rows name, summed before and after the pass. Deliberately
    /// not the folder: what the sweep freed is reported as `orphan_bytes` and
    /// `part_bytes` instead, so the two figures cannot be added together into a
    /// total nobody measured.
    pub bytes_before: u64,
    pub bytes_after: u64,
    pub cancelled: bool,
}

/// What the integrity pass found and fixed.
///
/// `checked` is every live picture whose bytes were read; `repaired` is the subset
/// whose name claimed a digest its bytes did not have. `skipped` is a row the pass
/// has nothing to say about: a name the gallery minted (`${id}-${original}`) makes
/// no claim, and the optimizer's normal run is what renames those.
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifySummary {
    pub checked: u32,
    pub repaired: u32,
    /// Rows whose file is not on this device. Not an error, and nothing to check.
    pub missing: u32,
    /// Rows whose name makes no claim (not `<sha256>.<ext>` yet).
    pub skipped: u32,
    /// Rows whose bytes do not decode as a picture at all. Reported, never
    /// "repaired": re-storing them would mint a name that certifies the damage.
    pub corrupt: u32,
    pub failed: u32,
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
///
/// What it cannot do is notice bytes that drifted after the write: a file that still
/// carries its digest name is reported optimal forever. That is the accepted half of
/// the trade, and it is why the checks that keep a name honest live at the two places
/// a file is created — `store_in`, which hashes what it writes, and
/// `sync_blob.rs::sync_blob_get`, which refuses a download whose name claims a
/// different digest — rather than at every read.
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

/// The decoder's name for the three types the gallery keeps.
///
/// `ext_of` is the same mapping, one direction round: a mime with no format here is a
/// type this app cannot store, which `img_mimes` already keeps out.
fn format_of(mime: &str) -> Option<image::ImageFormat> {
    match mime {
        "image/png" => Some(image::ImageFormat::Png),
        "image/jpeg" => Some(image::ImageFormat::Jpeg),
        WEBP => Some(image::ImageFormat::WebP),
        _ => None,
    }
}

/// Opens a picture, or says why it cannot be stored.
///
/// **The one place validity is decided**, and it was deliberately collapsed into one:
/// it used to be three (a decode in `verdict`, a container check in `transcode`, and
/// the format map in `ext_of`), and they drifted — the write path went on accepting a
/// text file renamed to `image/webp` for a commit after the read path had stopped
/// accepting one renamed to `image/png`.
///
/// Two questions, both the decoder's:
///
/// * **can anything parse these bytes** (`guess_format`), and
/// * **are they the type the row claims** — the picker only sees the client-declared
///   `file.type`, so a PNG renamed to `image/webp` used to be stored under a `.webp`
///   name with PNG bytes inside, which no reader would ever call wrong.
///
/// Decoding every format, WebP included, is deliberate. The never-re-encode rule is
/// about *encoding* (a second lossy pass costs quality forever), not about reading;
/// and the feared false positive — an animated WebP the decoder refuses — does not
/// exist: `image-webp` hands back the first frame. Judging WebP by its container
/// instead would accept a truncated file that the renderer cannot draw either.
fn open(bytes: &[u8], mime: &str) -> Result<image::DynamicImage, String> {
    let expected = format_of(mime).ok_or_else(|| UNREADABLE.to_string())?;
    let actual = image::guess_format(bytes).map_err(|_| UNREADABLE.to_string())?;
    if actual != expected {
        return Err(UNREADABLE.to_string());
    }
    image::load_from_memory_with_format(bytes, actual).map_err(|_| UNREADABLE.to_string())
}

/// What the integrity pass has to say about one file.
#[derive(Debug, PartialEq, Eq)]
enum Verdict {
    /// The bytes are not a picture. Never repaired: re-storing them would name the
    /// damage honestly and make it canonical.
    Corrupt,
    /// The name is not a digest yet (one the gallery minted), so it makes no claim.
    /// `run` is what content-addresses those.
    Unclaimed,
    /// The name claims exactly what the bytes hash to. The common answer.
    Consistent,
    /// The name claims one digest and the bytes have another: the drift this pass
    /// exists for, and the one thing no other code can see — the optimizer trusts
    /// the name, and a peer refuses the download instead of re-deriving it.
    Drifted,
}

/// Both questions, in the one order that cannot certify a broken file.
///
/// Validity comes first and does not depend on the name: a corrupt file whose name
/// happens to match its own hash is `Corrupt`, not `Consistent` — the name test
/// alone would call it finished, and that is exactly how a damaged picture becomes
/// permanent.
fn verdict(name: &str, mime: &str, bytes: &[u8]) -> Verdict {
    if open(bytes, mime).is_err() {
        return Verdict::Corrupt;
    }
    match content_digest(name, mime) {
        None => Verdict::Unclaimed,
        Some(claimed) if sha256_hex(bytes) == claimed => Verdict::Consistent,
        Some(_) => Verdict::Drifted,
    }
}

/// Counts one content key, reporting whether an earlier row already held it.
fn note_content(seen: &mut std::collections::HashMap<String, u32>, digest: &str) -> bool {
    let count = seen.entry(digest.to_string()).or_insert(0);
    let first = *count == 0;
    *count += 1;
    !first
}

/// What a re-encode produced, or why there is nothing to use.
#[derive(Debug)]
enum Transcoded {
    /// Bytes worth storing: a real encode that came out smaller.
    Smaller(Vec<u8>),
    /// Nothing to gain — already WebP, or the encode was no smaller. The original
    /// bytes are kept, which is a decision about *size*, not about validity.
    NotWorthIt,
}

/// Re-encodes a picture as WebP, capped at `MAX_EDGE` on the long edge.
///
/// The two "no" answers are deliberately different types. `NotWorthIt` is a size
/// judgement and the caller keeps the original. `Err(UNREADABLE)` is a *validity*
/// answer: these bytes are not a picture. Conflating them (the shape this function
/// had) let `store_in` keep garbage and name it honestly — `sha256(bytes)` of a file
/// nothing can draw — which is the one way the app could still mint a name that
/// certifies damage: `verify` reads it as consistent, and `sync_blob_get`'s guard
/// sees nothing to refuse.
fn transcode(bytes: &[u8], mime: &str) -> Result<Transcoded, String> {
    // Validity first, for every format: a decode that fails here means the bytes are
    // not a picture, and storing them under an honest name would hide that.
    let source = open(bytes, mime)?;
    if mime == WEBP {
        // A picture, and one this module will never re-encode: a second lossy pass
        // costs quality forever. It was opened only to be sure it *is* one.
        return Ok(Transcoded::NotWorthIt);
    }

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
    Ok(Transcoded::Smaller(encoded.to_vec()))
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
    // The size guard: a picture is re-encoded only when the result is smaller. An
    // already-tight JPEG can encode to a *bigger* WebP, and paying bytes plus a
    // generation of quality for a format change is not a trade worth making. The
    // consequence is that a plan's `convert` count counts candidates, not
    // conversions — the screen says so, rather than the plan encoding the whole
    // catalogue to find out.
    //
    // Undecodable bytes are not a size judgement: they fail here, so a new pick is
    // rejected (and its draft removed) instead of being committed as a picture, and
    // the run counts the row failed instead of renaming it.
    let converted = match transcode(bytes, mime)? {
        Transcoded::Smaller(out) if out.len() < bytes.len() => Some(out),
        _ => None,
    };
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
// Sweeping leftovers
// ============================================================================

/// What the sweep did (or, in a plan, would do).
#[derive(Debug, Default)]
struct Swept {
    orphans: u32,
    orphan_bytes: u64,
    parts: u32,
    part_bytes: u64,
}

/// One file in `AppData/images/`, as the sweep sees it.
struct Entry {
    name: String,
    bytes: u64,
    modified: SystemTime,
}

/// Everything in `AppData/images/`, in whatever order the filesystem hands it
/// over: nothing here sorts or counts, so the caller does not care.
///
/// A subdirectory is skipped rather than treated as a leftover: this module only
/// ever writes files here, and `remove_file` on a directory fails anyway.
fn entries(dir: &Path) -> Result<Vec<Entry>, String> {
    let read = std::fs::read_dir(dir).map_err(|error| {
        log::error!("image optimizer: could not read {}: {error}", dir.display());
        FAILED.to_string()
    })?;
    let mut out = Vec::new();
    for item in read {
        let item = match item {
            Ok(item) => item,
            Err(error) => {
                log::warn!("image optimizer: unreadable entry: {error}");
                continue;
            }
        };
        let meta = match item.metadata() {
            Ok(meta) => meta,
            Err(error) => {
                log::warn!(
                    "image optimizer: could not stat {}: {error}",
                    item.path().display()
                );
                continue;
            }
        };
        if !meta.is_file() {
            continue;
        }
        // A file whose mtime the platform will not tell us is left alone: the
        // sweep's only defence against deleting a picture mid-save is that age.
        let Ok(modified) = meta.modified() else {
            log::warn!(
                "image optimizer: no mtime for {}, left alone",
                item.path().display()
            );
            continue;
        };
        out.push(Entry {
            name: item.file_name().to_string_lossy().to_string(),
            bytes: meta.len(),
            modified,
        });
    }
    Ok(out)
}

/// What one file is, given how many live rows name it: a leftover, or nothing to
/// do.
///
/// The two tests are ordered, and both matter:
/// * **age first.** A file younger than `ORPHAN_GRACE` is left alone whatever the
///   count says, because the count is not yet true — a picture is written before
///   its row commits.
/// * **then the name.** A `.part` is scratch, never a picture's name, so it goes
///   regardless of the refcount (the count is about the name it was written *for*,
///   and that name is not on disk yet).
#[derive(PartialEq, Eq, Debug)]
enum Leftover {
    /// A whole picture no live row names.
    Orphan,
    /// A scratch file an interrupted write left behind.
    Part,
}

fn leftover(name: &str, modified: SystemTime, now: SystemTime, refs: i64) -> Option<Leftover> {
    let aged = now
        .duration_since(modified)
        // An mtime in the future (a clock that stepped back) reads as fresh.
        .is_ok_and(|age| age >= ORPHAN_GRACE);
    if !aged {
        return None;
    }
    if name.ends_with(PART_SUFFIX) {
        return Some(Leftover::Part);
    }
    if refs == 0 {
        return Some(Leftover::Orphan);
    }
    None
}

/// Unlinks one leftover. `false` when it was already gone (another sweep, or the
/// operator) or would not unlink — neither is an error worth failing the job for.
fn unlink(path: &Path) -> bool {
    match std::fs::remove_file(path) {
        Ok(()) => true,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => false,
        Err(error) => {
            log::warn!(
                "image optimizer: could not remove {}: {error}",
                path.display()
            );
            false
        }
    }
}

/// Walks the folder and reports — or, when `apply`, unlinks — every leftover.
///
/// This is the only pass in the app that starts from the directory instead of from
/// a row, and it exists because the other direction cannot be exhaustive: a file
/// whose row was never written is invisible to every query the app makes. The
/// count is `refs.sql`, the same one `release` obeys — deliberately not a second
/// definition of "who names this file", which is the drift `refs.sql` exists to
/// prevent.
async fn sweep(
    pool: &SqlitePool,
    dir: &Path,
    now: SystemTime,
    apply: bool,
) -> Result<Swept, String> {
    let list = entries(dir)?;
    // One count per name on disk, so `refs.sql` stays the single definition of
    // "who names this file": a hand-built set of referenced names would be a
    // second copy, and the day the two disagree a sweep deletes a live picture.
    //
    // That is one indexed query per file, which sounds worse than it measures: on
    // this schema 5000 counts took 7 ms (1.4 µs each) against an in-memory database,
    // so a shop with 20 000 pictures spends ~30 ms here — a few times that on disk,
    // and still nothing beside reading and stat-ing the folder. The lever, if a
    // catalogue ever makes it visible, is one grouped query over the four tables,
    // measured against this one rather than guessed at.
    let mut refs: HashMap<String, i64> = HashMap::new();
    for entry in &list {
        if entry.name.ends_with(PART_SUFFIX) || refs.contains_key(&entry.name) {
            continue;
        }
        let count: i64 = sqlx::query_scalar(REFS_SQL)
            .bind(entry.name.as_str())
            .fetch_one(pool)
            .await
            .map_err(|error| {
                log::error!(
                    "image optimizer: could not count references to {}: {error}",
                    entry.name
                );
                FAILED.to_string()
            })?;
        refs.insert(entry.name.clone(), count);
    }
    Ok(walk(dir, list, now, &refs, apply))
}

/// The decision and the unlinks, split from the listing and the count so the rule
/// can be exercised without a database (`sweep_*` tests).
fn walk(
    dir: &Path,
    list: Vec<Entry>,
    now: SystemTime,
    refs: &HashMap<String, i64>,
    apply: bool,
) -> Swept {
    let mut swept = Swept::default();
    for entry in list {
        let path = dir.join(&entry.name);
        if entry.name.ends_with(PART_SUFFIX) {
            if leftover(&entry.name, entry.modified, now, 0) != Some(Leftover::Part) {
                continue;
            }
            if apply && !unlink(&path) {
                continue;
            }
            swept.parts += 1;
            swept.part_bytes += entry.bytes;
            continue;
        }

        let count = refs.get(&entry.name).copied().unwrap_or(0);
        if leftover(&entry.name, entry.modified, now, count) != Some(Leftover::Orphan) {
            continue;
        }
        if apply && !unlink(&path) {
            continue;
        }
        swept.orphans += 1;
        swept.orphan_bytes += entry.bytes;
    }
    swept
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

    // The other direction, and the only pass that starts from the folder: files
    // nothing names. A read like the rest of the plan — nothing is unlinked here.
    let swept = sweep(&pool, &dir, SystemTime::now(), false).await?;
    plan.orphans = swept.orphans;
    plan.orphan_bytes = swept.orphan_bytes;
    plan.parts = swept.parts;
    plan.part_bytes = swept.part_bytes;
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
    let Some(cancel) = state.register() else {
        return Err(BUSY.to_string());
    };
    let outcome = run(&app, on_progress, &cancel).await;
    state.unregister(&cancel);
    outcome
}

/// Reads every live picture and repairs a name that no longer describes its bytes.
///
/// The name *is* the content (`<sha256>.<ext>`), which is what lets the optimizer
/// skip a finished row without reading it — and what makes a file whose bytes
/// drifted invisible: the fast path never looks. This pass is the one place that
/// looks, and the only place that can heal one, because the name is the shared
/// address: a peer offered a mismatched download refuses it
/// (`sync_blob.rs::sync_blob_get`) and cannot re-derive the name on its own.
///
/// A repair is the optimizer's own write sequence for one row: store the bytes under
/// the name they now hash to, point the row at it (clock and `image_blob_version`
/// together, markers cleared) so the next push republishes a consistent pair, then
/// retire the old file.
///
/// A file that does not decode is `corrupt` and nothing more. Re-storing it would
/// mint a name that certifies the damage — the opposite of the point.
///
/// It reads everything, which is why it is a button and not part of the run. A row
/// whose name is not of the digest shape is `skipped`, not repaired:
/// `image_optimize_run` is what content-addresses a legacy catalogue.
#[command]
pub async fn image_optimize_verify<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ImageOptState>,
    on_progress: Channel<OptProgress>,
) -> Result<VerifySummary, String> {
    let Some(cancel) = state.register() else {
        return Err(BUSY.to_string());
    };
    let outcome = verify(&app, on_progress, &cancel).await;
    state.unregister(&cancel);
    outcome
}

/// Stops a running `image_optimize_run` or `image_optimize_verify`. Not an error:
/// the command returns with `cancelled: true`.
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
                })?;

        // A row whose bytes are not a picture at all. Left exactly as it is: the
        // alternative `store_in` used to offer was keeping those bytes and naming
        // them honestly, which reads as finished to every check that trusts a name.
        // One unreadable picture must not abort the catalogue either.
        let stored = match stored {
            Ok(stored) => stored,
            Err(error) => {
                summary.failed += 1;
                log::warn!("image optimizer: {} left unreadable: {error}", row.name);
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

    // Last, once every row has been dealt with: what is left in the folder with no
    // row to name it. A cancelled job skips the sweep — the operator asked it to
    // stop, and an unlink is not the step to finish anyway.
    if !summary.cancelled {
        // A total of zero, which the screen draws as a stage without a counter:
        // this is one walk of the folder, not a per-picture stage.
        reporter.report("sweep", 0, 0, summary.bytes_before, summary.bytes_after);
        match sweep(&pool, &dir, SystemTime::now(), true).await {
            Ok(swept) => {
                summary.orphans_reclaimed = swept.orphans;
                summary.orphan_bytes = swept.orphan_bytes;
                summary.parts_reclaimed = swept.parts;
                summary.part_bytes = swept.part_bytes;
            }
            // The pictures are already done. A folder that will not list is
            // litter left for the next run, not a failed optimization.
            Err(error) => log::warn!("image optimizer: sweep skipped: {error}"),
        }
    }

    log::info!(
        "image optimizer: {} converted, {} renamed, {} reclaimed, {} failed, {} orphans and {} parts swept, {} bytes -> {} bytes{}",
        summary.converted,
        summary.renamed,
        summary.reclaimed,
        summary.failed,
        summary.orphans_reclaimed,
        summary.parts_reclaimed,
        summary.bytes_before,
        summary.bytes_after,
        if summary.cancelled { " (cancelled)" } else { "" }
    );
    Ok(summary)
}

/// The integrity pass: read each live picture, compare its bytes with the digest its
/// name claims, and repair the ones that disagree.
async fn verify<R: Runtime>(
    app: &AppHandle<R>,
    on_progress: Channel<OptProgress>,
    cancel: &Arc<AtomicBool>,
) -> Result<VerifySummary, String> {
    let pool = pool(app).await?;
    let dir = images_dir(app)?;
    let rows = live_rows(&pool).await?;
    let total = rows.len() as u32;
    let reporter = Reporter::new(on_progress);

    // One clock for the whole pass, for the same reason `run` keeps one: a repair's
    // `max(now, image_updated_at + 1)` has to stay ahead of the row it moves.
    let now = chrono::Utc::now().timestamp_millis();
    let mut summary = VerifySummary::default();
    reporter.report("verify", 0, total, 0, 0);

    for (index, row) in rows.iter().enumerate() {
        if cancel.load(Ordering::SeqCst) {
            summary.cancelled = true;
            break;
        }
        let step = index as u32 + 1;

        let path = dir.join(&row.name);
        let bytes = match std::fs::read(&path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                summary.missing += 1;
                reporter.report("verify", step, total, 0, 0);
                continue;
            }
            Err(error) => {
                log::warn!(
                    "image optimizer: could not read {}: {error}",
                    path.display()
                );
                summary.failed += 1;
                reporter.report("verify", step, total, 0, 0);
                continue;
            }
        };

        summary.checked += 1;

        // The decode is the expensive half, and with the digest it is one verdict —
        // on a worker thread, or a catalogue would stall the cart's flush timer.
        let work_name = row.name.clone();
        let work_mime = row.mime.clone();
        let (bytes, answer) = tauri::async_runtime::spawn_blocking(move || {
            let answer = verdict(&work_name, &work_mime, &bytes);
            (bytes, answer)
        })
        .await
        .map_err(|error| {
            log::error!("image optimizer: verify worker failed: {error}");
            FAILED.to_string()
        })?;

        match answer {
            Verdict::Corrupt => {
                summary.corrupt += 1;
                log::warn!(
                    "image optimizer: {} does not decode as a picture; left alone",
                    row.name
                );
                reporter.report("verify", step, total, 0, 0);
                continue;
            }
            Verdict::Unclaimed => {
                summary.skipped += 1;
                reporter.report("verify", step, total, 0, 0);
                continue;
            }
            Verdict::Consistent => {
                reporter.report("verify", step, total, 0, 0);
                continue;
            }
            // The only branch that writes.
            Verdict::Drifted => {}
        }

        log::warn!(
            "image optimizer: {} does not hash to the digest its name claims; repairing",
            row.name
        );

        // The encode is the CPU work, on a worker thread for the same reason the run
        // does it there: the cart's flush timer must not queue behind it.
        let work_dir = dir.clone();
        let work_mime = row.mime.clone();
        let stored =
            tauri::async_runtime::spawn_blocking(move || store_in(&work_dir, &bytes, &work_mime))
                .await
                .map_err(|error| {
                    log::error!("image optimizer: verify worker failed: {error}");
                    FAILED.to_string()
                })?;

        let stored = match stored {
            Ok(stored) => stored,
            Err(error) => {
                summary.failed += 1;
                log::warn!("image optimizer: could not re-store {}: {error}", row.name);
                reporter.report("verify", step, total, 0, 0);
                continue;
            }
        };

        // Row first, file second: a crash between the two leaves the repaired file
        // unreferenced (the sweep takes it), never a row pointing at nothing.
        if let Err(error) = retarget(&pool, &row.image_id, &stored, now).await {
            summary.failed += 1;
            log::error!(
                "image optimizer: {} left unretargeted after repair: {error}",
                row.image_id
            );
            reporter.report("verify", step, total, 0, 0);
            continue;
        }

        // The wrong-named file is nobody's now — unless a row somehow still holds the
        // old name, in which case `release` keeps it and the count stays honest.
        if let Err(error) = release(&pool, &dir, &row.name).await {
            // The row is already moved; a file that will not unlink is litter for the
            // sweep, not a failed repair.
            log::warn!("image optimizer: {error}");
        }
        summary.repaired += 1;
        reporter.report("verify", step, total, 0, 0);
    }

    reporter.report("verify", total, total, 0, 0);
    log::info!(
        "image optimizer: verify {} checked, {} repaired, {} corrupt, {} skipped, {} missing, {} failed{}",
        summary.checked,
        summary.repaired,
        summary.corrupt,
        summary.skipped,
        summary.missing,
        summary.failed,
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

    /// A real single-frame WebP (16×16, 64 bytes), made with Pillow.
    ///
    /// A real one, not a hand-rolled header: the write path now *decodes* every format
    /// before storing it, so a synthetic container is not a picture and every test
    /// built on one was passing on a fiction.
    const STATIC_WEBP: &[u8] = include_bytes!("../assets/images/static.webp");

    /// A real two-frame animated WebP (16×16, 204 bytes) — the case that was argued
    /// about from memory. `image-webp` hands back the first frame, so animation is not
    /// a false positive for the decoder.
    const ANIMATED_WEBP: &[u8] = include_bytes!("../assets/images/animated.webp");

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
        let bytes = STATIC_WEBP;
        let stored = store_in(dir.path(), bytes, WEBP).expect("store");

        // WebP is never re-encoded, so the bytes are untouched and the name is
        // their digest under the extension that mime implies.
        assert_eq!(stored.name, format!("{}.webp", sha256_hex(bytes)));
        assert_eq!(stored.mime, WEBP);
        assert_eq!(stored.bytes, 64);
        assert_eq!(files(dir.path()), vec![stored.name.clone()]);
        assert_eq!(
            std::fs::read(dir.path().join(&stored.name)).expect("read"),
            bytes
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
        let Transcoded::Smaller(converted) = transcode(&source, "image/png").expect("png converts")
        else {
            panic!("a 3000 px source must re-encode");
        };

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
        assert!(matches!(
            transcode(STATIC_WEBP, WEBP),
            Ok(Transcoded::NotWorthIt)
        ));
        // Opened, never encoded: what comes back to the caller is what went in.
        let dir = tempfile::tempdir().expect("tempdir");
        let stored = store_in(dir.path(), STATIC_WEBP, WEBP).expect("store");
        assert_eq!(stored.bytes, STATIC_WEBP.len() as u64);
    }

    #[test]
    fn an_animated_webp_is_a_picture() {
        // The fixture answers a question that was argued from memory: the pinned
        // decoder reads frame one and reports success, so "the decoder is stricter
        // than the renderer" is not true of `image-webp`, and a container check was
        // never needed to keep an animation from being called corrupt.
        assert!(
            image::load_from_memory(ANIMATED_WEBP).is_ok(),
            "if this fails, the WebP branch needs a container check again"
        );
        let digest = sha256_hex(ANIMATED_WEBP);
        assert_eq!(
            verdict(&format!("{digest}.webp"), WEBP, ANIMATED_WEBP),
            Verdict::Consistent
        );
        assert!(matches!(
            transcode(ANIMATED_WEBP, WEBP),
            Ok(Transcoded::NotWorthIt)
        ));
    }

    #[test]
    fn bytes_that_are_not_a_picture_are_refused_not_sized() {
        // The conflation this exists to prevent: a `.txt` renamed to image/png.
        // "Not smaller" would keep it and name it honestly; "undecodable" is a
        // failure the caller must not store.
        let error = transcode(b"just some text", "image/png").expect_err("not a picture");
        assert_eq!(error, UNREADABLE);
        // The promise holds for all three types, including the one the optimizer
        // never encodes.
        assert_eq!(
            transcode(b"just some text", WEBP).expect_err("not a WebP"),
            UNREADABLE
        );
        // A real picture cut in half, which is what a lost `.part` tail looks like.
        let picture = png(64, 64);
        assert!(transcode(&picture[..picture.len() / 2], "image/png").is_err());
        // And a picture that is not the type it claims: the picker only sees the
        // client-declared `file.type`, so this is the shape a renamed file takes, and
        // storing it would put PNG bytes behind a `.webp` name.
        assert_eq!(
            transcode(&picture, WEBP).expect_err("png declared as webp"),
            UNREADABLE
        );
        assert!(open(&picture, "image/jpeg").is_err());
    }

    // ---- one job at a time -----------------------------------------------

    #[test]
    fn a_second_job_cannot_steal_the_cancel_slot() {
        let state = ImageOptState::default();

        let first = state.register().expect("the first job takes the slot");
        assert!(
            state.register().is_none(),
            "a second job must be refused, not silently handed the first job's flag"
        );

        // The first job's cancel still reaches it, and so does its release.
        if let Ok(slot) = state.cancelled.lock() {
            assert!(slot.as_ref().is_some_and(|flag| Arc::ptr_eq(flag, &first)));
        }
        state.unregister(&first);
        if let Ok(slot) = state.cancelled.lock() {
            assert!(slot.is_none(), "the owner releases the slot");
        };
    }

    #[test]
    fn a_stranger_release_does_not_free_the_slot() {
        let state = ImageOptState::default();
        let first = state.register().expect("the first job takes the slot");

        // A job that already lost the slot (a timeout, a restarted pass) calls
        // `unregister` late: it must not open the door for a third one.
        let stranger = Arc::new(AtomicBool::new(false));
        state.unregister(&stranger);

        if let Ok(slot) = state.cancelled.lock() {
            assert!(slot.as_ref().is_some_and(|flag| Arc::ptr_eq(flag, &first)));
        }
        assert!(state.register().is_none(), "still busy");
    }

    // ---- the integrity pass ----------------------------------------------

    #[test]
    fn the_verdict_reads_bytes_before_it_reads_the_name() {
        let picture = png(32, 32);
        let digest = sha256_hex(&picture);

        assert_eq!(
            verdict(&format!("{digest}.png"), "image/png", &picture),
            Verdict::Consistent
        );
        assert_eq!(
            verdict(
                &format!("{}.png", sha256_hex(b"other")),
                "image/png",
                &picture
            ),
            Verdict::Drifted
        );
        // A name the gallery minted makes no claim; `run` content-addresses those.
        assert_eq!(
            verdict("img-1-rumah.png", "image/png", &picture),
            Verdict::Unclaimed
        );

        // The case the name test alone gets wrong: corrupt bytes whose name is
        // honestly the hash of those corrupt bytes. Repairing it would mint a name
        // that certifies the damage, so the decode has to be asked first.
        let garbage = b"this is not a picture";
        assert_eq!(
            verdict(
                &format!("{}.png", sha256_hex(garbage)),
                "image/png",
                garbage
            ),
            Verdict::Corrupt
        );
        // And a real picture cut short: a `.part` write that lost its tail still
        // decodes as nothing.
        let truncated = &picture[..picture.len() / 2];
        assert_eq!(
            verdict(
                &format!("{}.png", sha256_hex(truncated)),
                "image/png",
                truncated
            ),
            Verdict::Corrupt
        );
    }

    // ---- the sweep -------------------------------------------------------

    /// A file aged past `ORPHAN_GRACE`, so age never masks the rule under test.
    fn old() -> SystemTime {
        SystemTime::now() - ORPHAN_GRACE - Duration::from_secs(60)
    }

    #[test]
    fn a_young_file_is_never_a_leftover() {
        let now = SystemTime::now();

        // The save window: the file exists, and its row commits seconds later. A
        // sweep that trusted the count here would delete the picture being saved.
        assert_eq!(leftover("abc.webp", now, now, 0), None);
        assert_eq!(leftover("abc.webp.part", now, now, 0), None);

        // An mtime ahead of us (a clock that stepped back) reads as fresh too.
        let future = now + Duration::from_secs(3600);
        assert_eq!(leftover("abc.webp", future, now, 0), None);
    }

    #[test]
    fn an_aged_file_is_a_leftover_only_when_nothing_names_it() {
        let now = SystemTime::now();

        assert_eq!(leftover("abc.webp", old(), now, 0), Some(Leftover::Orphan));
        // Named by a row: kept, whatever its age.
        assert_eq!(leftover("abc.webp", old(), now, 1), None);
        // Named by several: kept.
        assert_eq!(leftover("abc.webp", old(), now, 7), None);
    }

    #[test]
    fn a_part_is_swept_regardless_of_the_refcount() {
        let now = SystemTime::now();

        // The count is about the name the scratch was written for, and that name is
        // not on disk yet: a `.part` is never a picture's name.
        assert_eq!(
            leftover("abc.webp.part", old(), now, 0),
            Some(Leftover::Part)
        );
        assert_eq!(
            leftover("abc.webp.part", old(), now, 3),
            Some(Leftover::Part)
        );
    }

    fn touch(dir: &Path, name: &str, bytes: &[u8], age: SystemTime) {
        let path = dir.join(name);
        std::fs::write(&path, bytes).expect("write the fixture");
        let file = std::fs::File::options()
            .write(true)
            .open(&path)
            .expect("open the fixture");
        file.set_modified(age).expect("age the fixture");
    }

    #[test]
    fn the_sweep_takes_orphans_and_parts_and_leaves_the_rest() {
        let dir = tempfile::tempdir().expect("tempdir");
        let now = SystemTime::now();
        let aged = now - ORPHAN_GRACE - Duration::from_secs(60);

        touch(dir.path(), "named.webp", b"aaaa", aged);
        touch(dir.path(), "orphan.webp", b"bbbb", aged);
        touch(dir.path(), "saving.webp", b"cccc", now);
        touch(dir.path(), "crashed.webp.part", b"dd", aged);

        let list = entries(dir.path()).expect("list");
        let refs = HashMap::from([
            ("named.webp".to_string(), 2),
            ("saving.webp".to_string(), 0),
        ]);

        // A plan: the same count, and nothing leaves the disk.
        let planned = walk(dir.path(), list, now, &refs, false);
        assert_eq!((planned.orphans, planned.orphan_bytes), (1, 4));
        assert_eq!((planned.parts, planned.part_bytes), (1, 2));
        assert_eq!(files(dir.path()).len(), 4, "a plan unlinks nothing");

        let list = entries(dir.path()).expect("list again");
        let swept = walk(dir.path(), list, now, &refs, true);
        assert_eq!((swept.orphans, swept.orphan_bytes), (1, 4));
        assert_eq!((swept.parts, swept.part_bytes), (1, 2));

        // The file a row names survives; so does the one whose save is still in
        // flight. The orphan and the crashed scratch are gone.
        assert_eq!(
            files(dir.path()),
            vec!["named.webp".to_string(), "saving.webp".to_string()]
        );
    }

    #[test]
    fn a_second_sweep_finds_nothing() {
        let dir = tempfile::tempdir().expect("tempdir");
        let now = SystemTime::now();
        touch(
            dir.path(),
            "orphan.webp",
            b"bbbb",
            now - ORPHAN_GRACE - Duration::from_secs(60),
        );

        let empty = HashMap::new();
        let first = walk(
            dir.path(),
            entries(dir.path()).expect("list"),
            now,
            &empty,
            true,
        );
        assert_eq!(first.orphans, 1);

        let second = walk(
            dir.path(),
            entries(dir.path()).expect("list"),
            now,
            &empty,
            true,
        );
        assert_eq!(second.orphans, 0, "nothing left to sweep");
    }
}
