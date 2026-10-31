//! Streaming transport for the sync protocol (`backend-docs/sync-contract.md`).
//!
//! # Why this lives in Rust
//!
//! The contract is written against the web platform: both directions are raw
//! NDJSON byte streams, resume is a byte offset plus a sha256 chain over those
//! bytes, and the upload side is a duplex PATCH whose response streams while the
//! request body is consumed. None of that survives the trip into this app:
//!
//!   * `fetch` in the webview runs under the window CSP, whose `connect-src` is
//!     `'self' ipc:` — a request to the sync host is blocked before it leaves.
//!     Loosening it would mean allowing every origin, because the endpoint is
//!     user-configured.
//!   * a streaming request body (`ReadableStream` in `fetch`) is not reliably
//!     implemented in the WebViews we ship on, and `reqwest` (the HTTP stack
//!     `plugin-http` wraps) does not guarantee one either.
//!   * `CompressionStream`/`DecompressionStream` and `crypto.subtle` depend on
//!     the webview build; the hashing side is too load-bearing to gamble on.
//!
//! So the stream is materialised *here* and pushed to the frontend over a Tauri
//! `Channel`, one NDJSON line per message. On the TS side `src/services/sync/
//! stream.ts` wraps the channel in a `ReadableStream`-shaped reader, which is
//! the polyfill the rest of the sync service is written against (`pull.ts`,
//! `push.ts`). The request bodies are whole chunks — the contract explicitly
//! frames uploads as "streaming across calls, not within one" — so nothing needs
//! a duplex body.
//!
//! # Addressing
//!
//! Offsets, frame counts and the chain hash are always over **uncompressed**
//! bytes (contract §4.4). `sync_upload_chunk` may gzip the body on the way out,
//! and `sync_pull` advertises `Accept-Encoding: gzip`; reqwest decodes the
//! response body before it reaches the line splitter, so the emitted lines are
//! always the canonical plaintext ones.
//!
//! # Cancellation
//!
//! A Tauri command cannot be aborted from JS once invoked, so every streaming
//! command takes a `request_id` and registers a flag that `sync_cancel` flips.
//! The read loop checks it between chunks, so leaving the Sinkronisasi screen
//! stops the download instead of letting it run to completion.

use std::collections::HashMap;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::ipc::Channel;

/// A host that never answers should not hold the sync fiber forever.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(20);

/// sha256("") — the chain's anchor (contract §7.3, `C_0`).
///
/// The contract writes `C_0 = ""` and then explains it as "sha256 of nothing,
/// defined as e3b0c442…". Sending an empty header value for the first chunk is
/// not useful to a server that compares strings, so the digest itself is the
/// anchor. The TS side owns the constant (`services/sync/chain.ts`) and passes
/// it in: if the backend settles on the other reading, one constant moves.
pub const EMPTY_SHA256: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// ============================================================================
// State
// ============================================================================

#[derive(Default)]
pub struct SyncState {
    /// Cancellation flags, keyed by the `request_id` the caller supplied.
    cancelled: Mutex<HashMap<String, Arc<AtomicBool>>>,
    /// One client (and so one connection pool) for the whole app.
    http: OnceLock<reqwest::Client>,
}

impl SyncState {
    fn client(&self) -> reqwest::Client {
        self.http
            .get_or_init(|| {
                reqwest::Client::builder()
                    .connect_timeout(CONNECT_TIMEOUT)
                    // No total timeout: a pull of 1000 rows or a long ack stream
                    // is legitimately slow on a bad connection, and the caller
                    // can cancel instead.
                    .build()
                    .unwrap_or_else(|_| reqwest::Client::new())
            })
            .clone()
    }

    fn register(&self, id: &str) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        if let Ok(mut map) = self.cancelled.lock() {
            map.insert(id.to_string(), flag.clone());
        }
        flag
    }

    fn unregister(&self, id: &str) {
        if let Ok(mut map) = self.cancelled.lock() {
            map.remove(id);
        }
    }
}

// ============================================================================
// Wire types
// ============================================================================

/// One message on the IPC channel. The TS reader parses it and hands the line
/// to the NDJSON frame decoder.
#[derive(Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum StreamEvent {
    /// One complete NDJSON line, without its terminating newline.
    Line { line: String },
    /// The last message: every line has already been sent. The frontend closes
    /// its reader on this, not on the command's return value, because channel
    /// messages are delivered out of band and the last line can land after the
    /// invoke response.
    End,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamSummary {
    pub lines: i64,
    pub cancelled: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDto {
    pub upload_id: String,
    pub at: i64,
    pub frames: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthDto {
    pub protocol: i64,
    pub snapshot_seq: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChainDto {
    /// The chain hash *after* the given lines — the `Upload-Prefix-Sha256` for
    /// the offset those lines end at.
    pub chain: String,
    /// Uncompressed byte count of the given lines, newline terminators included.
    pub bytes: i64,
}

/// Every failure a command can report. The shape matches the TS
/// `SyncTransportError`, so the sync service can branch on `code` (§11).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFailure {
    /// HTTP status, or 0 when the failure happened before/without a response.
    pub status: u16,
    pub code: String,
    pub message: String,
}

impl SyncFailure {
    fn transport(message: String) -> Self {
        Self {
            status: 0,
            code: "transport".to_string(),
            message,
        }
    }

    fn internal(message: String) -> Self {
        Self {
            status: 0,
            code: "internal".to_string(),
            message,
        }
    }
}

#[derive(Deserialize)]
struct ErrorEnvelope {
    error: WireError,
}

#[derive(Deserialize)]
struct WireError {
    code: String,
    message: String,
}

#[derive(Deserialize)]
struct SessionWire {
    upload_id: String,
    #[serde(default)]
    at: i64,
    #[serde(default)]
    frames: i64,
}

#[derive(Deserialize)]
struct HealthWire {
    protocol: i64,
    snapshot_seq: i64,
}

// ============================================================================
// Commands
// ============================================================================

/// Stops a running `sync_pull`/`sync_upload_chunk`. Not an error: the command
/// returns `StreamSummary { cancelled: true }`.
#[tauri::command]
pub fn sync_cancel(state: tauri::State<'_, SyncState>, id: String) -> Result<(), String> {
    if let Ok(map) = state.cancelled.lock() {
        if let Some(flag) = map.get(&id) {
            flag.store(true, Ordering::SeqCst);
        }
    }
    Ok(())
}

/// `GET /v1/health` — the version handshake (§12).
#[tauri::command]
pub async fn sync_health(
    state: tauri::State<'_, SyncState>,
    base_url: String,
    token: String,
) -> Result<HealthDto, SyncFailure> {
    let client = state.client();
    let url = format!("{}/v1/health", trim_base(&base_url));
    let resp = client
        .get(url)
        .bearer_auth(&token)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }

    let wire: HealthWire = json_body(resp).await?;
    Ok(HealthDto {
        protocol: wire.protocol,
        snapshot_seq: wire.snapshot_seq,
    })
}

/// `POST /v1/upload` — opens the session that covers every entity (§7.1).
#[tauri::command]
pub async fn sync_create_session(
    state: tauri::State<'_, SyncState>,
    base_url: String,
    token: String,
) -> Result<SessionDto, SyncFailure> {
    let client = state.client();
    let url = format!("{}/v1/upload", trim_base(&base_url));
    let resp = client
        .post(url)
        .bearer_auth(&token)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }

    let wire: SessionWire = json_body(resp).await?;
    Ok(SessionDto {
        upload_id: wire.upload_id,
        at: wire.at,
        frames: wire.frames,
    })
}

/// `GET /v1/upload/:id` — the server's pointer, which is the only truth about
/// progress after a disconnect (§7.5).
#[tauri::command]
pub async fn sync_get_session(
    state: tauri::State<'_, SyncState>,
    base_url: String,
    token: String,
    upload_id: String,
) -> Result<SessionDto, SyncFailure> {
    let client = state.client();
    let url = session_url(&base_url, &upload_id);
    let resp = client
        .get(url)
        .bearer_auth(&token)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }

    let wire: SessionWire = json_body(resp).await?;
    Ok(SessionDto {
        upload_id: wire.upload_id,
        at: wire.at,
        frames: wire.frames,
    })
}

/// `DELETE /v1/upload/:id` — abandon a session. A missing session is the state
/// we wanted, so `404` is a success (§7.5: expired session → new one).
#[tauri::command]
pub async fn sync_delete_session(
    state: tauri::State<'_, SyncState>,
    base_url: String,
    token: String,
    upload_id: String,
) -> Result<(), SyncFailure> {
    let client = state.client();
    let url = session_url(&base_url, &upload_id);
    let resp = client
        .delete(url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(transport)?;

    if resp.status().is_success() || resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(());
    }
    Err(failure(resp).await)
}

/// `GET /v1/pull?since=&limit=` — the download half of the loop (§8).
///
/// Every NDJSON line is pushed to `channel` as it arrives; the return value only
/// reports how many were emitted and whether the caller cancelled.
#[tauri::command]
pub async fn sync_pull(
    state: tauri::State<'_, SyncState>,
    channel: Channel<String>,
    base_url: String,
    token: String,
    since: i64,
    limit: u32,
    request_id: String,
) -> Result<StreamSummary, SyncFailure> {
    let client = state.client();
    let flag = state.register(&request_id);
    let outcome = pull_stream(&client, &flag, &base_url, &token, since, limit, &channel).await;
    state.unregister(&request_id);
    outcome
}

/// `PATCH /v1/upload/:id` — appends one chunk and streams the acks back (§7.2).
///
/// `body` is the chunk's canonical NDJSON text. `offset` and `prefix_sha` are
/// the *uncompressed* pointer the chunk starts at; the chain hash for the bytes
/// this chunk adds is computed on the TS side with `sync_chain`, before the body
/// is compressed here.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sync_upload_chunk(
    state: tauri::State<'_, SyncState>,
    channel: Channel<String>,
    base_url: String,
    token: String,
    upload_id: String,
    offset: i64,
    prefix_sha: String,
    body: String,
    compress: bool,
    request_id: String,
) -> Result<StreamSummary, SyncFailure> {
    let client = state.client();
    let flag = state.register(&request_id);
    let outcome = upload_chunk_stream(
        &client,
        &flag,
        &channel,
        &base_url,
        &token,
        &upload_id,
        offset,
        &prefix_sha,
        body.as_bytes(),
        compress,
    )
    .await;
    state.unregister(&request_id);
    outcome
}

/// Computes the rolling prefix hash (§7.3) and the byte count for `lines`,
/// starting from `prev`.
///
///   C_0 = EMPTY_SHA256
///   C_n = hex(sha256(hex2bytes(C_{n-1}) || "\n" || line_bytes))
///
/// `line_bytes` excludes the terminating newline; the byte count includes it,
/// because that is what an offset counts.
#[tauri::command]
pub fn sync_chain(prev: String, lines: Vec<String>) -> ChainDto {
    // An empty prefix means "the chain has not started yet", which is `C_0`. The
    // TS side passes the anchor explicitly (`services/sync/chain.ts`); accepting
    // the empty string here keeps the two conventions interchangeable.
    let mut chain = if prev.is_empty() {
        EMPTY_SHA256.to_string()
    } else {
        prev
    };
    let mut bytes: i64 = 0;
    for line in lines {
        chain = chain_step(&chain, line.as_bytes());
        bytes += line.len() as i64 + 1;
    }
    ChainDto { chain, bytes }
}

// ============================================================================
// Internals
// ============================================================================

fn trim_base(base_url: &str) -> &str {
    base_url.trim().trim_end_matches('/')
}

fn session_url(base_url: &str, upload_id: &str) -> String {
    format!("{}/v1/upload/{}", trim_base(base_url), upload_id)
}

fn transport(error: reqwest::Error) -> SyncFailure {
    // The URL is user-configured, so the message is about the connection, not a
    // raw reqwest chain the cashier could act on.
    log::warn!("sync transport error: {error}");
    SyncFailure::transport(format!("Koneksi ke server gagal: {error}"))
}

fn internal<E: std::fmt::Display>(error: E) -> SyncFailure {
    log::error!("sync internal error: {error}");
    SyncFailure::internal(format!("Kesalahan internal sinkronisasi: {error}"))
}

async fn json_body<T: serde::de::DeserializeOwned>(
    resp: reqwest::Response,
) -> Result<T, SyncFailure> {
    let text = resp.text().await.map_err(transport)?;
    serde_json::from_str(&text).map_err(|error| {
        log::warn!("sync: unreadable response: {text}");
        SyncFailure::internal(format!("Respons server tidak dikenali: {error}"))
    })
}

/// Turns a non-2xx response into the contract's error shape (§11). Falls back to
/// the HTTP status when the body is not the documented envelope (a proxy or a
/// Cloudflare error page, say).
async fn failure(resp: reqwest::Response) -> SyncFailure {
    let status = resp.status().as_u16();
    let text = resp.text().await.unwrap_or_default();
    match serde_json::from_str::<ErrorEnvelope>(&text) {
        Ok(envelope) => SyncFailure {
            status,
            code: envelope.error.code,
            message: envelope.error.message,
        },
        Err(_) => SyncFailure {
            status,
            code: "http_error".to_string(),
            message: if text.trim().is_empty() {
                format!("Server membalas {status}")
            } else {
                text
            },
        },
    }
}

async fn pull_stream(
    client: &reqwest::Client,
    flag: &AtomicBool,
    base_url: &str,
    token: &str,
    since: i64,
    limit: u32,
    channel: &Channel<String>,
) -> Result<StreamSummary, SyncFailure> {
    let url = format!(
        "{}/v1/pull?since={}&limit={}",
        trim_base(base_url),
        since,
        limit
    );
    let resp = client
        .get(url)
        .bearer_auth(token)
        .header(reqwest::header::ACCEPT, "application/x-ndjson")
        // reqwest decodes a gzip body transparently, so the splitter below only
        // ever sees canonical plaintext (§4.4).
        .header(reqwest::header::ACCEPT_ENCODING, "gzip")
        .send()
        .await
        .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }

    stream_lines(resp, flag, channel).await
}

#[allow(clippy::too_many_arguments)]
async fn upload_chunk_stream(
    client: &reqwest::Client,
    flag: &AtomicBool,
    channel: &Channel<String>,
    base_url: &str,
    token: &str,
    upload_id: &str,
    offset: i64,
    prefix_sha: &str,
    body: &[u8],
    compress: bool,
) -> Result<StreamSummary, SyncFailure> {
    let url = session_url(base_url, upload_id);

    if compress {
        let payload = gzip(body)?;
        let resp = send_chunk(
            client,
            &url,
            token,
            offset,
            prefix_sha,
            payload,
            Some("gzip"),
        )
        .await?;
        // A server that refuses the coding must still get the chunk: retry
        // identity (§4.4 "the client retries identity").
        if resp.status() == reqwest::StatusCode::UNSUPPORTED_MEDIA_TYPE {
            log::warn!("sync: server refused gzip, retrying identity");
            let resp =
                send_chunk(client, &url, token, offset, prefix_sha, body.to_vec(), None).await?;
            if !resp.status().is_success() {
                return Err(failure(resp).await);
            }
            return stream_lines(resp, flag, channel).await;
        }
        if !resp.status().is_success() {
            return Err(failure(resp).await);
        }
        return stream_lines(resp, flag, channel).await;
    }

    let resp = send_chunk(client, &url, token, offset, prefix_sha, body.to_vec(), None).await?;
    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }
    stream_lines(resp, flag, channel).await
}

#[allow(clippy::too_many_arguments)]
async fn send_chunk(
    client: &reqwest::Client,
    url: &str,
    token: &str,
    offset: i64,
    prefix_sha: &str,
    payload: Vec<u8>,
    encoding: Option<&str>,
) -> Result<reqwest::Response, SyncFailure> {
    let mut request = client
        .patch(url)
        .bearer_auth(token)
        .header(reqwest::header::CONTENT_TYPE, "application/x-ndjson")
        .header(reqwest::header::ACCEPT, "application/x-ndjson")
        .header(reqwest::header::ACCEPT_ENCODING, "gzip")
        .header("Upload-Offset", offset.to_string())
        .header("Upload-Prefix-Sha256", prefix_sha)
        .body(payload);

    if let Some(encoding) = encoding {
        request = request.header(reqwest::header::CONTENT_ENCODING, encoding);
    }

    request.send().await.map_err(transport)
}

/// Reads the body chunk by chunk, cutting it into lines at the newlines. A line
/// split across two chunks is held in `pending` until it completes — byte
/// offsets are line boundaries, so a partial line is never emitted (§4.1).
async fn stream_lines(
    resp: reqwest::Response,
    flag: &AtomicBool,
    channel: &Channel<String>,
) -> Result<StreamSummary, SyncFailure> {
    let mut body = resp.bytes_stream();
    let mut pending: Vec<u8> = Vec::new();
    let mut lines: i64 = 0;

    while let Some(chunk) = body.next().await {
        if flag.load(Ordering::SeqCst) {
            send_end(channel)?;
            return Ok(StreamSummary {
                lines,
                cancelled: true,
            });
        }
        let bytes = chunk.map_err(transport)?;
        pending.extend_from_slice(&bytes);
        emit_complete_lines(&mut pending, channel, &mut lines)?;
    }

    // A stream that ended without its last newline is still a line; the server
    // is supposed to terminate every frame, so this only rescues a broken tail.
    if !pending.is_empty() {
        let tail = std::mem::take(&mut pending);
        emit_line(&tail, channel, &mut lines)?;
    }

    send_end(channel)?;
    Ok(StreamSummary {
        lines,
        cancelled: false,
    })
}

fn send_end(channel: &Channel<String>) -> Result<(), SyncFailure> {
    let message = serde_json::to_string(&StreamEvent::End).map_err(internal)?;
    channel.send(message).map_err(|error| {
        SyncFailure::internal(format!("Gagal mengirim data ke aplikasi: {error}"))
    })?;
    Ok(())
}

fn emit_complete_lines(
    pending: &mut Vec<u8>,
    channel: &Channel<String>,
    lines: &mut i64,
) -> Result<(), SyncFailure> {
    while let Some(position) = pending.iter().position(|byte| *byte == b'\n') {
        let line: Vec<u8> = pending.drain(..=position).collect();
        let body = &line[..line.len() - 1];
        if body.is_empty() {
            continue;
        }
        emit_line(body, channel, lines)?;
    }
    Ok(())
}

fn emit_line(line: &[u8], channel: &Channel<String>, lines: &mut i64) -> Result<(), SyncFailure> {
    let event = StreamEvent::Line {
        line: String::from_utf8_lossy(line).into_owned(),
    };
    let message = serde_json::to_string(&event).map_err(internal)?;
    channel.send(message).map_err(|error| {
        SyncFailure::internal(format!("Gagal mengirim data ke aplikasi: {error}"))
    })?;
    *lines += 1;
    Ok(())
}

fn gzip(bytes: &[u8]) -> Result<Vec<u8>, SyncFailure> {
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(bytes).map_err(internal)?;
    encoder.finish().map_err(internal)
}

fn chain_step(prev_hex: &str, line: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(hex_to_bytes(prev_hex));
    hasher.update(b"\n");
    hasher.update(line);
    to_hex(&hasher.finalize())
}

fn hex_to_bytes(hex: &str) -> Vec<u8> {
    let bytes = hex.as_bytes();
    let mut out = Vec::with_capacity(bytes.len() / 2);
    let mut index = 0;
    while index + 1 < bytes.len() {
        let high = (bytes[index] as char).to_digit(16);
        let low = (bytes[index + 1] as char).to_digit(16);
        match (high, low) {
            (Some(high), Some(low)) => out.push((high * 16 + low) as u8),
            // The chain is ours, so this only happens on a programming error;
            // an unreadable prefix starts the chain over rather than panicking.
            _ => return Vec::new(),
        }
        index += 2;
    }
    out
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

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_round_trips() {
        let bytes = [0x00, 0x0f, 0xa5, 0xff];
        assert_eq!(to_hex(&bytes), "000fa5ff");
        assert_eq!(hex_to_bytes("000fa5ff"), bytes.to_vec());
        assert!(hex_to_bytes("").is_empty());
    }

    #[test]
    fn chain_anchor_matches_sha256_of_nothing() {
        assert_eq!(to_hex(&Sha256::digest(b"")), EMPTY_SHA256);
    }

    #[test]
    fn chain_is_sequential_and_counts_terminators() {
        let lines = vec!["{\"a\":1}".to_string(), "{}".to_string()];
        let once = sync_chain(EMPTY_SHA256.to_string(), lines.clone());
        let twice = sync_chain(EMPTY_SHA256.to_string(), lines);
        assert_eq!(once.chain, twice.chain);
        assert_eq!(once.bytes, 7 + 1 + 2 + 1);

        let step = chain_step(EMPTY_SHA256, b"{\"a\":1}");
        let after = sync_chain(step, vec!["{}".to_string()]);
        assert_eq!(after.chain, once.chain);
        assert_eq!(after.bytes, 3);
    }
}
