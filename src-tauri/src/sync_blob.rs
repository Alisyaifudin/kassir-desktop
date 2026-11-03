//! The product group's image-byte side channel (`SYNC-V2.md` §2.10, §8.7.1).
//!
//! An `image` **row** syncs through `product_group_change_log` like every other
//! catalog row. Its **bytes** do not: they are content-addressed objects served
//! by three routes that spend no `seq`, write no log entry and move no bookmark.
//! This module is the client half of those three routes, and it is deliberately
//! the only place in the app that reads or writes an image file for the network.
//!
//! ```text
//! GET  /v2/product/image/manifest?after=…   which hash is current for each image
//! PUT  /v2/product/image/blob/{id}?version=…  this device's bytes go up, from disk
//! GET  /v2/blob/{sha256}                      the server's bytes come down, to disk
//! ```
//!
//! # Why the files are handled here and not in the webview
//!
//! Two reasons, and both are the reason `sync.rs` exists at all:
//!
//!   * the window CSP (`connect-src 'self' ipc:`) blocks a webview request to the
//!     user-configured sync host, so the bytes cannot be fetched with `fetch`;
//!   * the bytes are already files under `AppData/images/` (`src/lib/image.ts`
//!     writes them there), so moving them through the webview would mean reading
//!     up to 8 MB into JS memory, hashing it there and handing it back.
//!
//! So the direction of every transfer is decided here: an upload names the local
//! file, a download writes it. The frontend names a file and a version; it never
//! names a path, and it never sees the bytes.
//!
//! # What this side guarantees
//!
//!   * **The row is the address.** An upload carries the `image_id` and the
//!     `version` (`image_updated_at`) the file was produced for. The server
//!     refuses an unknown row (`404 image_unknown`) and a deleted one
//!     (`409 image_deleted`); the client pushes rows before bytes, so those are
//!     answers it can act on rather than errors to retry forever.
//!   * **A download is verified before it lands.** The body is written to
//!     `<name>.part`, hashed as it arrives, and only `rename()`d into place when
//!     both the byte count and the sha256 match. A truncated or corrupted
//!     download leaves the previous file untouched and removes the scratch file,
//!     so a reader never sees half a picture.
//!   * **`rename()` is the commit.** Both files live in the same directory, so the
//!     rename is atomic on every platform the app ships on: a crash leaves either
//!     the old file or the new one, never a mixture.
//!   * **Nothing is buffered whole on the way down.** The body is hashed and
//!     written chunk by chunk, refusing past `BLOB_MAX_BYTES` (the server's own
//!     upload bound) even if the server or a proxy lies about the length.
//!
//! # What it deliberately does not do
//!
//! An upload is one buffered body: reading the file into memory is the only way
//! `reqwest` can send a file that is already smaller than 8 MB, and hashing it in
//! Rust would duplicate a check the server performs anyway (it sniffs the magic
//! bytes and returns the digest it computed). There is no retry loop here either:
//! `src/services/sync/blob.ts` treats every failure as "this image waits for the
//! next cycle", which is exactly what the contract asks for — bytes are a cache of
//! the row and never gate the bookmark.

use std::io::Write;
use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Manager;

use crate::sync::{
    failure, identify, internal, transport, trim_base, ClientIdentity, RequestIdentity,
    SyncFailure, SyncState,
};

/// The folder the gallery's files live in, under `app_data_dir` — the same one
/// `src/lib/image.ts` writes to (`BaseDirectory.AppData` + `images/<name>`).
const IMAGES_DIR: &str = "images";

/// The scratch suffix a download is written under before its `rename()`.
const PART_SUFFIX: &str = ".part";

/// The largest single image the server accepts, and therefore the most this side
/// will read from disk or write to it. Checking it here turns an oversized file
/// into a `413` the caller can report instead of a request the server has to
/// refuse after the body has already been sent.
const BLOB_MAX_BYTES: u64 = 8 * 1024 * 1024;

/// The three types the gallery can hold, and the only ones the server's sniff
/// accepts (§8.7.1). `images.image_mime` carries one of these.
const BLOB_MIMES: [&str; 3] = ["image/png", "image/jpeg", "image/webp"];

/// The longest local file name this side will touch, matching the server's bound
/// on `image_name` (a display name that is also this device's file key).
const FILE_NAME_MAX: usize = 200;

// ============================================================================
// Wire types
// ============================================================================

/// One entry of `GET /v2/product/image/manifest` — the server's snake_case body.
#[derive(Debug, Deserialize)]
struct WireBlob {
    image_id: String,
    version: i64,
    sha256: String,
    byte_size: i64,
    mime: String,
}

#[derive(Debug, Deserialize)]
struct WireManifest {
    #[serde(default)]
    blobs: Vec<WireBlob>,
    #[serde(default)]
    more: bool,
    #[serde(default)]
    next: Option<String>,
}

/// The manifest as the frontend receives it. `camelCase` because every other IPC
/// value is, and this one is consumed by TypeScript.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobRef {
    image_id: String,
    version: i64,
    sha256: String,
    byte_size: i64,
    mime: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobManifest {
    blobs: Vec<BlobRef>,
    /// True when the server has more entries after `next`.
    more: bool,
    /// The `image_id` to continue from, or `null` at the end of the manifest.
    next: Option<String>,
}

/// The `201`/`200` body of an upload, as the server documents it.
#[derive(Debug, Deserialize)]
struct WirePut {
    image_id: String,
    version: i64,
    sha256: String,
    byte_size: i64,
    mime: String,
    #[serde(default)]
    deduped: bool,
    #[serde(default)]
    current: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobPut {
    status: u16,
    image_id: String,
    version: i64,
    /// The digest the server stored for `(image_id, version)` — what the local
    /// row's `image_blob_sha256` records.
    sha256: String,
    byte_size: i64,
    mime: String,
    /// The bytes were already stored (a retry, or another image shares them).
    deduped: bool,
    /// False when a newer `image_updated_at` already owns this image: the bytes
    /// were stored but will never be served (§8.7.1), which is not an error.
    current: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobGet {
    sha256: String,
    byte_size: i64,
    /// The type the server stored the object as (its `Content-Type`), not a guess.
    mime: String,
}

// ============================================================================
// Commands
// ============================================================================

/// `GET /v2/product/image/manifest?after=&limit=` — which hash is current for
/// each live image row whose blob version equals its `image_updated_at`.
///
/// One request, not a stream: a manifest page is a JSON array the caller wants
/// whole before it starts downloading, and it is a join over the entity tables
/// rather than a log, so it has no bookmark and no ordering meaning (§8.7.1).
#[tauri::command]
pub async fn sync_blob_manifest(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    after: Option<String>,
    limit: u32,
    client: ClientIdentity,
) -> Result<BlobManifest, SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let mut url = format!(
        "{}/v2/product/image/manifest?limit={}",
        trim_base(&base_url),
        limit.max(1)
    );
    if let Some(after) = after.filter(|value| !value.is_empty()) {
        url.push_str("&after=");
        url.push_str(&encode_query(&after));
    }

    let resp = identify(
        http.get(url)
            .bearer_auth(&token)
            .header(reqwest::header::ACCEPT, "application/json"),
        &who,
    )
    .send()
    .await
    .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }
    // `reqwest` is built without its `json` feature (the sync transport only ever
    // reads text), so the body is parsed here — one small object per call.
    let text = resp
        .text()
        .await
        .map_err(|error| internal(format!("Manifest gambar tidak dapat dibaca: {error}")))?;
    let body: WireManifest = serde_json::from_str(&text)
        .map_err(|error| internal(format!("Manifest gambar tidak dapat dibaca: {error}")))?;

    Ok(BlobManifest {
        blobs: body
            .blobs
            .into_iter()
            .map(|blob| BlobRef {
                image_id: blob.image_id,
                version: blob.version,
                sha256: blob.sha256,
                byte_size: blob.byte_size,
                mime: blob.mime,
            })
            .collect(),
        more: body.more,
        next: body.next,
    })
}

/// `PUT /v2/product/image/blob/{image_id}?version={image_updated_at}` — upload one
/// image's bytes, read from `AppData/images/<file_name>`.
///
/// The row must already exist on the server (`404 image_unknown` otherwise), which
/// is why the caller uploads rows first and bytes after their ack (§8.7.1).
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sync_blob_put(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    image_id: String,
    version: i64,
    file_name: String,
    mime: String,
    client: ClientIdentity,
) -> Result<BlobPut, SyncFailure> {
    if !path_safe(&image_id, 100) {
        return Err(bad_request("Id gambar tidak valid"));
    }
    if !BLOB_MIMES.contains(&mime.as_str()) {
        return Err(unsupported(
            "Tipe gambar tidak didukung. Gunakan png, jpeg atau webp.",
        ));
    }
    let name =
        safe_file_name(&file_name).ok_or_else(|| bad_request("Nama berkas gambar tidak valid"))?;
    let path = images_dir(&app)?.join(&name);

    // The file is this device's own bytes: a missing one is not a failure to
    // report, it is an image this device never had (the row was pulled from
    // another till). `local_missing` tells the caller to forget the version it
    // recorded, which turns the row into a download on the next pass.
    let bytes = match std::fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) => {
            log::info!("sync: no local file {} ({error})", path.display());
            return Err(local_missing(&name));
        }
    };
    if bytes.is_empty() {
        return Err(local_missing(&name));
    }
    if bytes.len() as u64 > BLOB_MAX_BYTES {
        return Err(SyncFailure {
            status: 413,
            code: "payload_too_large".to_string(),
            message: format!(
                "Gambar {} lebih dari {} MB sehingga tidak dapat diunggah",
                name,
                BLOB_MAX_BYTES / (1024 * 1024)
            ),
            floor: None,
        });
    }

    let url = format!(
        "{}/v2/product/image/blob/{}?version={}",
        trim_base(&base_url),
        image_id,
        version
    );
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let resp = identify(
        http.put(url)
            .bearer_auth(&token)
            // A claim, and the server checks it: a body whose magic bytes say
            // otherwise is a `415` rather than a lie every later download repeats.
            .header(reqwest::header::CONTENT_TYPE, mime)
            .header(reqwest::header::ACCEPT, "application/json")
            // The sync client asks for gzip on the NDJSON routes; here the body is
            // already-compressed image bytes, so a coding would only cost a decode.
            .header(reqwest::header::ACCEPT_ENCODING, "identity"),
        &who,
    )
    .body(bytes)
    .send()
    .await
    .map_err(transport)?;

    let status = resp.status().as_u16();
    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }
    let text = resp
        .text()
        .await
        .map_err(|error| internal(format!("Jawaban unggah gambar tidak dapat dibaca: {error}")))?;
    let body: WirePut = serde_json::from_str(&text)
        .map_err(|error| internal(format!("Jawaban unggah gambar tidak dapat dibaca: {error}")))?;

    Ok(BlobPut {
        status,
        image_id: body.image_id,
        version: body.version,
        sha256: body.sha256,
        byte_size: body.byte_size,
        mime: body.mime,
        deduped: body.deduped,
        current: body.current,
    })
}

/// `GET /v2/blob/{sha256}` — download one image's bytes into
/// `AppData/images/<file_name>`, verified before it replaces anything.
#[tauri::command]
pub async fn sync_blob_get(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    sha256: String,
    file_name: String,
    client: ClientIdentity,
) -> Result<BlobGet, SyncFailure> {
    if !valid_sha256(&sha256) {
        return Err(bad_request("Hash gambar tidak valid"));
    }
    let name =
        safe_file_name(&file_name).ok_or_else(|| bad_request("Nama berkas gambar tidak valid"))?;
    let dir = images_dir(&app)?;
    let final_path = dir.join(&name);
    let part_path = dir.join(format!("{name}{PART_SUFFIX}"));

    let url = format!("{}/v2/blob/{}", trim_base(&base_url), sha256);
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let resp = identify(
        http.get(url)
            .bearer_auth(&token)
            .header(reqwest::header::ACCEPT, "*/*")
            // `identity`, not the `gzip` the NDJSON routes ask for: the body is
            // verified against the digest the server published, and a transparent
            // decode would also make `Content-Length` describe the wrong bytes.
            .header(reqwest::header::ACCEPT_ENCODING, "identity"),
        &who,
    )
    .send()
    .await
    .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }
    let expected_length = resp.content_length();
    let mime = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();

    // A missing images directory is not an error: a fresh install that pulls a
    // catalogue before anyone saved a picture has no `images/` yet.
    if let Err(error) = std::fs::create_dir_all(&dir) {
        return Err(internal(format!(
            "Folder gambar tidak dapat dibuat ({}): {error}",
            dir.display()
        )));
    }

    match receive(resp, &part_path, expected_length, &sha256).await {
        Ok(written) => {
            if let Err(error) = std::fs::rename(&part_path, &final_path) {
                let _ = std::fs::remove_file(&part_path);
                return Err(internal(format!(
                    "Berkas gambar tidak dapat dipasang ({}): {error}",
                    final_path.display()
                )));
            }
            Ok(BlobGet {
                sha256: sha256.clone(),
                byte_size: written as i64,
                mime,
            })
        }
        Err(error) => {
            // The scratch file never becomes a picture: the previous file (if any)
            // is untouched, so a reader keeps the picture it already had.
            let _ = std::fs::remove_file(&part_path);
            Err(error)
        }
    }
}

// ============================================================================
// Internals
// ============================================================================

/// Reads the body into `part_path`, hashing as it goes, and refuses anything that
/// does not end up being exactly the object it asked for.
async fn receive(
    resp: reqwest::Response,
    part_path: &Path,
    expected_length: Option<u64>,
    sha256: &str,
) -> Result<u64, SyncFailure> {
    let mut file = std::fs::File::create(part_path)
        .map_err(|error| internal(format!("Berkas gambar tidak dapat ditulis: {error}")))?;
    let mut hasher = Sha256::new();
    let mut written: u64 = 0;
    let mut body = resp.bytes_stream();

    while let Some(chunk) = body.next().await {
        let bytes = match chunk {
            Ok(bytes) => bytes,
            // A dropped connection is a retry, not a corrupted file: the caller
            // gets the transport error and the scratch file is removed.
            Err(error) => return Err(transport(error)),
        };
        written += bytes.len() as u64;
        if written > BLOB_MAX_BYTES {
            return Err(SyncFailure {
                status: 413,
                code: "payload_too_large".to_string(),
                message: "Gambar dari server melebihi batas ukuran".to_string(),
                floor: None,
            });
        }
        hasher.update(&bytes);
        file.write_all(&bytes)
            .map_err(|error| internal(format!("Berkas gambar tidak dapat ditulis: {error}")))?;
    }
    file.flush()
        .map_err(|error| internal(format!("Berkas gambar tidak dapat ditulis: {error}")))?;
    drop(file);

    if let Some(expected) = expected_length {
        if expected != written {
            return Err(internal(format!(
                "Unduhan gambar tidak utuh ({written} dari {expected} bita)"
            )));
        }
    }
    let digest = to_hex(hasher.finalize().as_slice());
    if digest != sha256 {
        return Err(internal(format!(
            "Isi gambar tidak cocok dengan hash yang diminta ({digest})"
        )));
    }
    Ok(written)
}

/// `AppData/images`, the folder `src/lib/image.ts` writes the gallery into.
fn images_dir(app: &tauri::AppHandle) -> Result<PathBuf, SyncFailure> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|error| internal(format!("Folder aplikasi tidak ditemukan: {error}")))?;
    Ok(base.join(IMAGES_DIR))
}

/// A local file name this side will join onto the images directory and nothing
/// else: no separator, no parent hop, no NUL. `images.image_name` reaches here, so
/// it is treated as untrusted input even though this app writes it.
///
/// The name is used exactly as the row holds it — it is the key the gallery reads
/// the file back by (`src/lib/image.ts`), so trimming it here would look for a
/// file nobody wrote.
fn safe_file_name(name: &str) -> Option<String> {
    if name.trim().is_empty() || name.len() > FILE_NAME_MAX {
        return None;
    }
    if name == "."
        || name == ".."
        || name.contains('\0')
        || name.contains('/')
        || name.contains('\\')
        // A `.part` name is this side's scratch file; the gallery may not claim it.
        || name.ends_with(PART_SUFFIX)
    {
        return None;
    }
    Some(name.to_string())
}

/// True when `value` is safe as one URL path segment and one path component.
fn path_safe(value: &str, max: usize) -> bool {
    !value.is_empty()
        && value.len() <= max
        && value
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-'))
}

/// `sha256` must be the 64 lowercase hex characters the route names, checked
/// before it becomes a path segment.
fn valid_sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .chars()
            .all(|ch| ch.is_ascii_digit() || matches!(ch, 'a'..='f'))
}

fn to_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for &byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

fn bad_request(message: &str) -> SyncFailure {
    SyncFailure {
        status: 400,
        code: "bad_request".to_string(),
        message: message.to_string(),
        floor: None,
    }
}

fn unsupported(message: &str) -> SyncFailure {
    SyncFailure {
        status: 415,
        code: "unsupported_media_type".to_string(),
        message: message.to_string(),
        floor: None,
    }
}

/// This device has no file for an image it thought it owned. Not a server error:
/// the client clears the recorded version and fetches the picture instead.
fn local_missing(name: &str) -> SyncFailure {
    SyncFailure {
        status: 0,
        code: "local_missing".to_string(),
        message: format!("Gambar {name} tidak ada di perangkat ini"),
        floor: None,
    }
}

/// The `after` cursor is an `image_id`, which the server bounds to a plain id; it
/// is still percent-encoded so an id can never add a query parameter.
fn encode_query(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_file_name_cannot_leave_the_images_folder() {
        assert_eq!(
            safe_file_name("01H-IMG_0001.png").as_deref(),
            Some("01H-IMG_0001.png")
        );
        assert_eq!(safe_file_name("../store.json"), None);
        assert_eq!(safe_file_name("images/../../db"), None);
        assert_eq!(safe_file_name("a\\b.png"), None);
        assert_eq!(safe_file_name(""), None);
        assert_eq!(safe_file_name("   "), None);
        assert_eq!(safe_file_name("."), None);
        assert_eq!(safe_file_name(".."), None);
        // The scratch name is this module's, not the gallery's.
        assert_eq!(safe_file_name("picture.png.part"), None);
        assert!(safe_file_name(&"a".repeat(FILE_NAME_MAX)).is_some());
        assert_eq!(safe_file_name(&"a".repeat(FILE_NAME_MAX + 1)), None);
    }

    #[test]
    fn an_image_id_is_one_path_segment() {
        assert!(path_safe("01HQ8Z3K4M5N6P7Q8R9S0T", 100));
        assert!(path_safe("img.1_2-3", 100));
        assert!(!path_safe("../admin", 100));
        assert!(!path_safe("a/b", 100));
        assert!(!path_safe("C:kassir", 100));
        assert!(!path_safe("", 100));
        assert!(!path_safe(&"a".repeat(101), 100));
    }

    #[test]
    fn only_a_full_lowercase_digest_is_a_hash() {
        assert!(valid_sha256(&"a".repeat(64)));
        assert!(valid_sha256(&"0123456789abcdef".repeat(4)));
        assert!(!valid_sha256(&"a".repeat(63)));
        assert!(!valid_sha256(&"A".repeat(64)));
        assert!(!valid_sha256("../../../etc/passwd"));
    }

    #[test]
    fn the_digest_matches_the_sha256_spec() {
        // The empty input's digest, from FIPS 180-4.
        assert_eq!(
            to_hex(Sha256::digest(b"").as_slice()),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            to_hex(Sha256::digest(b"abc").as_slice()),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn a_query_value_cannot_add_a_parameter() {
        assert_eq!(encode_query("01HQ&limit=1"), "01HQ%26limit%3D1");
        assert_eq!(encode_query("plain-id_1.2~"), "plain-id_1.2~");
    }

    /// The manifest's snake_case body is what the server documents; a renamed
    /// field would otherwise parse as an empty manifest and every image would
    /// silently fall back to a placeholder.
    #[test]
    fn the_manifest_body_parses_as_the_server_writes_it() {
        let body: WireManifest = serde_json::from_str(
            r#"{"blobs":[{"image_id":"img_1","version":1700000000000,"sha256":"aa","byte_size":12,"mime":"image/png"}],"more":true,"next":"img_1"}"#,
        )
        .expect("manifest body");
        assert_eq!(body.blobs.len(), 1);
        assert_eq!(body.blobs[0].image_id, "img_1");
        assert_eq!(body.blobs[0].version, 1_700_000_000_000);
        assert_eq!(body.blobs[0].byte_size, 12);
        assert!(body.more);
        assert_eq!(body.next.as_deref(), Some("img_1"));
    }

    #[test]
    fn an_upload_answer_carries_the_digest_and_the_current_flag() {
        let body: WirePut = serde_json::from_str(
            r#"{"image_id":"img_1","version":1,"sha256":"bb","byte_size":3,"mime":"image/png","deduped":true,"current":false}"#,
        )
        .expect("put body");
        assert_eq!(body.sha256, "bb");
        assert!(body.deduped);
        assert!(!body.current);
    }
}
