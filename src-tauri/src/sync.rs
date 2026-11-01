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

/// How many leading bytes of the first line the `Head` event reports. Matches
/// the server's `canonical_head_hex`/`wire_head_hex` width, so the two halves of
/// a failure are directly comparable.
const HEAD_BYTES: usize = 8;

// ============================================================================
// Wire types
// ============================================================================

/// One message on the IPC channel. The TS reader parses it and hands the line
/// to the NDJSON frame decoder.
#[derive(Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum StreamEvent {
    /// The first bytes of the body, sent once before the first `Line`.
    ///
    /// This exists because of a real failure: the server answered `200`, the
    /// response was labelled gzip and compressed twice, and the only symptom was
    /// "line cannot be parsed". `from_utf8_lossy` below destroys exactly the
    /// evidence that would have named it, so the raw head is captured here, in
    /// Rust, before any decoding.
    ///
    /// `hex` is the first bytes of the first line (`1f8b0800` = gzip magic where
    /// JSON was expected, `7b2274` = `{"t`); `bytes` is that line's length.
    Head { hex: String, bytes: i64 },
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

/// Who is calling, on top of the token.
///
/// The server records these in its request log (`kassir-backend/docs/LOGS.md`).
/// Without them a row can only say *which token* called, and every till sharing a
/// token is indistinguishable — which is what made the gzip-of-gzip failure
/// impossible to attribute to a device or to a build.
///
/// `device_id` comes from the app's store (it is the only durable per-install
/// value the webview owns); `request_id` is generated per call on the TS side so
/// the failure reporter can name the request it is complaining about.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientIdentity {
    pub device_id: String,
    pub request_id: String,
}

/// The identifying headers for one request, already made safe to send.
struct RequestIdentity {
    device_id: String,
    version: String,
    request_id: String,
}

impl RequestIdentity {
    /// `version` comes from the binary itself rather than from the frontend: the
    /// point of the header is to know which build behaved badly, and the app
    /// bundle is the only authority on that.
    fn new(app: &tauri::AppHandle, client: &ClientIdentity) -> Self {
        Self::with_version(client, &app.package_info().version.to_string())
    }

    /// Split out from `new` so the header mapping can be tested without an
    /// `AppHandle` (and so the version stays an argument, not a global).
    fn with_version(client: &ClientIdentity, version: &str) -> Self {
        Self {
            device_id: header_safe(&client.device_id, 64),
            version: header_safe(version, 40),
            request_id: header_safe(&client.request_id, 80),
        }
    }
}

///
/// Restricted to the shapes the server will store (it drops anything else) and
/// bounded, because these values also land in indexed log columns. An invalid
/// header value would otherwise fail the request itself.
fn header_safe(value: &str, max: usize) -> String {
    value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | ':' | '-'))
        .take(max)
        .collect()
}

/// Applies the identifying headers. Empty values are omitted rather than sent
/// blank, so the server records "unknown" instead of "".
fn identify(mut builder: reqwest::RequestBuilder, who: &RequestIdentity) -> reqwest::RequestBuilder {
    for (name, value) in [
        ("x-kassir-device-id", &who.device_id),
        ("x-kassir-version", &who.version),
        ("x-kassir-request-id", &who.request_id),
    ] {
        if !value.is_empty() {
            builder = builder.header(name, value);
        }
    }
    builder.header(reqwest::header::USER_AGENT, user_agent(&who.version))
}

/// `KassirDesktop/0.4.2 (windows)` — the platform is part of the identity: a
/// Windows-only bug in a desktop app is not a rare thing.
fn user_agent(version: &str) -> String {
    let version = if version.is_empty() { "unknown" } else { version };
    format!("KassirDesktop/{version} ({})", std::env::consts::OS)
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

/// A failure report, in the shape `POST /v1/diagnostics` expects.
///
/// camelCase in (from TS), snake_case out (to the server). One struct so the two
/// sides cannot drift, and so the field the server requires
/// (`client_request_id`) is impossible to forget here.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all(serialize = "snake_case", deserialize = "camelCase"))]
pub struct DiagnosticReport {
    /// The id this device gave the failing request (`X-Kassir-Request-Id`), which
    /// is the server's only way to join the report to its own log row.
    pub client_request_id: String,
    /// `parse` when the bytes were never JSON, `frame` when they were JSON of the
    /// wrong shape. Different investigations, hence a whitelisted field.
    pub stage: String,
    /// The route the failing call went to, so the row is readable on its own.
    pub route: String,
    pub message: String,
    /// First bytes received, hex: the observation the server cannot make.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_bytes_hex: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<i64>,
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
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    client: ClientIdentity,
) -> Result<HealthDto, SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let url = format!("{}/v1/health", trim_base(&base_url));
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
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    client: ClientIdentity,
) -> Result<SessionDto, SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let url = format!("{}/v1/upload", trim_base(&base_url));
    let resp = identify(
        http.post(url)
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
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    upload_id: String,
    client: ClientIdentity,
) -> Result<SessionDto, SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let url = session_url(&base_url, &upload_id);
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
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    upload_id: String,
    client: ClientIdentity,
) -> Result<(), SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let url = session_url(&base_url, &upload_id);
    let resp = identify(http.delete(url).bearer_auth(&token), &who).send()
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
    app: tauri::AppHandle,
    channel: Channel<String>,
    base_url: String,
    token: String,
    since: i64,
    limit: u32,
    client: ClientIdentity,
) -> Result<StreamSummary, SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    // The same id names the log row on the server and the cancel flag here.
    let flag = state.register(&client.request_id);
    let outcome = pull_stream(&http, &flag, &who, &base_url, &token, since, limit, &channel).await;
    state.unregister(&client.request_id);
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
    app: tauri::AppHandle,
    channel: Channel<String>,
    base_url: String,
    token: String,
    upload_id: String,
    offset: i64,
    prefix_sha: String,
    body: String,
    compress: bool,
    client: ClientIdentity,
) -> Result<StreamSummary, SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let flag = state.register(&client.request_id);
    let outcome = upload_chunk_stream(
        &http,
        &flag,
        &who,
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
    state.unregister(&client.request_id);
    outcome
}

/// `POST /v1/diagnostics` — hands the server a failure only this device can see.
///
/// A Worker cannot observe what the runtime does to its own response body, so for
/// a wire-level failure the client holds the only evidence. This is the way back.
///
/// Best effort by contract: the caller has already failed a sync, and losing the
/// report must never turn that into a different failure. The frontend invokes this
/// and ignores the result.
#[tauri::command]
pub async fn sync_diagnose(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    report: DiagnosticReport,
    client: ClientIdentity,
) -> Result<(), SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let url = format!("{}/v1/diagnostics", trim_base(&base_url));
    // Serialised by hand: reqwest's `json` feature is off, and serde_json is
    // already here for every other body in this file.
    let body = serde_json::to_vec(&report).map_err(internal)?;
    let resp = identify(
        http.post(url)
            .bearer_auth(&token)
            .header(reqwest::header::CONTENT_TYPE, "application/json"),
        &who,
    )
    .body(body)
    .send()
    .await
    .map_err(transport)?;

    if resp.status().is_success() {
        Ok(())
    } else {
        Err(failure(resp).await)
    }
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
    http: &reqwest::Client,
    flag: &AtomicBool,
    who: &RequestIdentity,
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
    let resp = identify(
        http.get(url)
            .bearer_auth(token)
            .header(reqwest::header::ACCEPT, "application/x-ndjson")
            // reqwest decodes a gzip body transparently, so the splitter below
            // only ever sees canonical plaintext (§4.4).
            .header(reqwest::header::ACCEPT_ENCODING, "gzip"),
        who,
    )
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
    http: &reqwest::Client,
    flag: &AtomicBool,
    who: &RequestIdentity,
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
        let resp = send_chunk(http, who, &url, token, offset, prefix_sha, payload, Some("gzip"))
            .await?;
        // A server that refuses the coding must still get the chunk: retry
        // identity (§4.4 "the client retries identity").
        if resp.status() == reqwest::StatusCode::UNSUPPORTED_MEDIA_TYPE {
            log::warn!("sync: server refused gzip, retrying identity");
            let resp =
                send_chunk(http, who, &url, token, offset, prefix_sha, body.to_vec(), None).await?;
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

    let resp = send_chunk(http, who, &url, token, offset, prefix_sha, body.to_vec(), None).await?;
    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }
    stream_lines(resp, flag, channel).await
}

#[allow(clippy::too_many_arguments)]
async fn send_chunk(
    http: &reqwest::Client,
    who: &RequestIdentity,
    url: &str,
    token: &str,
    offset: i64,
    prefix_sha: &str,
    payload: Vec<u8>,
    encoding: Option<&str>,
) -> Result<reqwest::Response, SyncFailure> {
    let mut request = identify(
        http.patch(url)
            .bearer_auth(token)
            .header(reqwest::header::CONTENT_TYPE, "application/x-ndjson")
            .header(reqwest::header::ACCEPT, "application/x-ndjson")
            .header(reqwest::header::ACCEPT_ENCODING, "gzip")
            .header("Upload-Offset", offset.to_string())
            .header("Upload-Prefix-Sha256", prefix_sha),
        who,
    )
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
    // Emitted once, from the first line's raw bytes — before `from_utf8_lossy`
    // can destroy them. See `StreamEvent::Head`.
    let mut head_sent = false;

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
        emit_complete_lines(&mut pending, channel, &mut lines, &mut head_sent)?;
    }

    // A stream that ended without its last newline is still a line; the server
    // is supposed to terminate every frame, so this only rescues a broken tail.
    if !pending.is_empty() {
        let tail = std::mem::take(&mut pending);
        emit_line(&tail, channel, &mut lines, &mut head_sent)?;
    }

    send_end(channel)?;
    Ok(StreamSummary {
        lines,
        cancelled: false,
    })
}

fn send_event(event: &StreamEvent, channel: &Channel<String>) -> Result<(), SyncFailure> {
    let message = serde_json::to_string(event).map_err(internal)?;
    channel.send(message).map_err(|error| {
        SyncFailure::internal(format!("Gagal mengirim data ke aplikasi: {error}"))
    })?;
    Ok(())
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
    head_sent: &mut bool,
) -> Result<(), SyncFailure> {
    while let Some(position) = pending.iter().position(|byte| *byte == b'\n') {
        let line: Vec<u8> = pending.drain(..=position).collect();
        let body = &line[..line.len() - 1];
        if body.is_empty() {
            continue;
        }
        emit_line(body, channel, lines, head_sent)?;
    }
    Ok(())
}

/// The first `HEAD_BYTES` of `line`, hex, plus its length.
///
/// Pulled out as a function because it is the whole diagnostic: it must be
/// captured before the lossy UTF-8 decode turns binary into replacement
/// characters, and it is worth testing without a socket.
fn head_of(line: &[u8]) -> (String, i64) {
    let take = line.len().min(HEAD_BYTES);
    (to_hex(&line[..take]), line.len() as i64)
}

fn emit_line(
    line: &[u8],
    channel: &Channel<String>,
    lines: &mut i64,
    head_sent: &mut bool,
) -> Result<(), SyncFailure> {
    if !*head_sent {
        *head_sent = true;
        let (hex, bytes) = head_of(line);
        send_event(&StreamEvent::Head { hex, bytes }, channel)?;
    }
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

    // -- identifying headers (docs/LOGS.md on the backend) -------------------

    #[test]
    fn the_ts_side_can_send_the_identity_as_camel_case() {
        // The one seam no type checker on either side can see: Tauri hands the
        // `client` argument to serde as the JS object, so this is the exact shape
        // `transport.ts` builds. If it ever stops matching, every sync request
        // fails to deserialize rather than losing a header quietly.
        let client: ClientIdentity = serde_json::from_value(serde_json::json!({
            "deviceId": "4f1c9e2a-1111-4222-8333-444455556666",
            "requestId": "pull-m8x2k1-7",
        }))
        .expect("the TS identity shape deserializes");
        assert_eq!(client.device_id, "4f1c9e2a-1111-4222-8333-444455556666");
        assert_eq!(client.request_id, "pull-m8x2k1-7");
    }

    fn identity() -> RequestIdentity {
        RequestIdentity::with_version(
            &ClientIdentity {
                device_id: "4f1c9e2a-1111-4222-8333-444455556666".to_string(),
                request_id: "pull-m8x2k1-7".to_string(),
            },
            "0.4.2",
        )
    }

    #[test]
    fn identity_headers_identify_the_install_and_the_call() {
        let request = identify(reqwest::Client::new().get("http://localhost/v1/pull"), &identity())
            .build()
            .expect("request builds");
        let headers = request.headers();
        assert_eq!(
            headers.get("x-kassir-device-id").unwrap(),
            "4f1c9e2a-1111-4222-8333-444455556666"
        );
        assert_eq!(headers.get("x-kassir-version").unwrap(), "0.4.2");
        assert_eq!(headers.get("x-kassir-request-id").unwrap(), "pull-m8x2k1-7");
        // The platform is part of the identity: a Windows-only bug is not rare.
        assert_eq!(
            headers.get(reqwest::header::USER_AGENT).unwrap(),
            format!("KassirDesktop/0.4.2 ({})", std::env::consts::OS).as_str()
        );
    }

    #[test]
    fn header_values_are_restricted_to_what_the_server_will_store() {
        // The server drops anything outside [A-Za-z0-9._:-] rather than guessing,
        // so a value that would be stored as NULL must not reach it looking real.
        assert_eq!(header_safe("a b\tc;d", 64), "abcd");
        assert_eq!(header_safe("kst_7f-3a.9c:21", 64), "kst_7f-3a.9c:21");
        // Bounded before it is sent, not after the server clips it: a header that
        // silently differs from the id in the request is a correlation that lies.
        assert_eq!(header_safe(&"x".repeat(100), 8), "xxxxxxxx");
        // An unusable id is omitted rather than sent blank.
        assert!(header_safe("\u{1f600}", 64).is_empty());
    }

    #[test]
    fn a_missing_version_still_names_the_client() {
        let who = RequestIdentity::with_version(
            &ClientIdentity {
                device_id: String::new(),
                request_id: "health-1".to_string(),
            },
            "",
        );
        let request = identify(reqwest::Client::new().get("http://localhost/v1/health"), &who)
            .build()
            .expect("request builds");
        let headers = request.headers();
        assert!(headers.get("x-kassir-device-id").is_none());
        assert!(headers.get("x-kassir-version").is_none());
        assert_eq!(
            headers.get(reqwest::header::USER_AGENT).unwrap(),
            format!("KassirDesktop/unknown ({})", std::env::consts::OS).as_str()
        );
    }

    // -- wire evidence (docs/LOGS.md phase 4) --------------------------------

    #[test]
    fn the_head_is_captured_before_the_utf8_decode() {
        // gzip magic where NDJSON belongs: this is the byte sequence the client
        // saw in the double-compression incident, and the reason the head is
        // captured in Rust — `from_utf8_lossy` would turn it into U+FFFD.
        let gzip = [0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03];
        assert_eq!(head_of(&gzip), ("1f8b080000000000".to_string(), 10));

        let ndjson = b"{\"t\":\"meta\",\"snapshot_seq\":0}";
        let (hex, bytes) = head_of(ndjson);
        assert_eq!(hex, "7b2274223a226d65"); // {"t":"me
        assert_eq!(bytes, ndjson.len() as i64);
    }

    #[test]
    fn a_short_head_is_not_padded() {
        // A one-byte first "line" is itself the diagnosis: a body of binary with a
        // 0x0a in it. Truncating to what exists keeps that visible.
        assert_eq!(head_of(&[0x1f]), ("1f".to_string(), 1));
        assert_eq!(head_of(&[]), (String::new(), 0));
    }

    #[test]
    fn the_report_is_sent_in_the_shape_the_server_reads() {
        // camelCase from TS, snake_case on the wire; the server's endpoint requires
        // `client_request_id` and whitelists `stage`/`route`.
        let report: DiagnosticReport = serde_json::from_value(serde_json::json!({
            "clientRequestId": "pull-m8x2k1-7",
            "stage": "parse",
            "route": "/v1/pull",
            "message": "Baris NDJSON dari server tidak dapat dibaca",
            "firstBytesHex": "1f8b0800",
            "bytes": 1417,
        }))
        .expect("the TS report shape deserializes");

        let wire: serde_json::Value = serde_json::to_value(&report).expect("report serializes");
        assert_eq!(wire["client_request_id"], "pull-m8x2k1-7");
        assert_eq!(wire["first_bytes_hex"], "1f8b0800");
        assert_eq!(wire["bytes"], 1417);
        assert_eq!(wire["stage"], "parse");
        // Absent fields are omitted rather than sent as null: the endpoint treats a
        // missing `first_bytes_hex` as "nothing was received".
        let without = DiagnosticReport {
            first_bytes_hex: None,
            bytes: None,
            ..serde_json::from_value(serde_json::json!({
                "clientRequestId": "pull-1",
                "stage": "stream",
                "route": "/v1/pull",
                "message": "x",
            }))
            .expect("minimal report deserializes")
        };
        let wire = serde_json::to_value(&without).expect("report serializes");
        assert!(wire.get("first_bytes_hex").is_none());
        assert!(wire.get("bytes").is_none());
    }

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
