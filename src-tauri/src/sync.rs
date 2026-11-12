//! Streaming transport for the v2 money-group sync (`SYNC-V2-MONEY.md`).
//!
//! # Why this lives in Rust
//!
//! The contract is written against the web platform: both directions are raw
//! NDJSON streams. None of that survives the trip into this app:
//!
//!   * `fetch` in the webview runs under the window CSP, whose `connect-src` is
//!     `'self' ipc:` — a request to the sync host is blocked before it leaves.
//!     Loosening it would mean allowing every origin, because the endpoint is
//!     user-configured.
//!   * a streaming *response* body is what both endpoints need (a pull page can
//!     be 1000 lines), and the webview cannot read one under `ipc:`.
//!   * `CompressionStream` depends on the webview build, so the gzip decode is
//!     left to `reqwest`, which has it compiled in.
//!
//! So the stream is materialised *here* and pushed to the frontend over a Tauri
//! `Channel`, one NDJSON line per message. On the TS side
//! `src/services/sync/stream.ts` wraps the channel in a `ReadableStream`-shaped
//! reader, which is the polyfill `pull.ts`/`push.ts` are written against.
//!
//! # What v2 removed
//!
//! There is no session, no upload id, no byte offset and no hash chain any more
//! (§7.1 "state: none"). Both endpoints are stateless:
//!
//!   * `sync_pull`  → `GET  {base}/v2/{group}/pull/{after}?limit=N[&count=1]`
//!   * `sync_push`  → `POST {base}/v2/{group}/push` with an NDJSON body
//!
//! The server's snapshot, seqs and acks are all in the lines themselves, so this
//! file only has to move bytes and report why a request failed.
//!
//! # Cancellation
//!
//! A Tauri command cannot be aborted from JS once invoked, so every streaming
//! command takes a `request_id` and registers a flag that `sync_cancel` flips.
//! The read loop checks it between chunks, so leaving the Sinkronisasi screen
//! stops the download instead of letting it run to completion.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

/// A host that never answers should not hold the sync fiber forever.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(20);

/// How many leading bytes of the first line the `Head` event reports.
const HEAD_BYTES: usize = 8;

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
    pub(crate) fn client(&self) -> reqwest::Client {
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
    /// The first bytes of the body, sent once before the first `Line`.
    ///
    /// Kept from v1 because it is the only evidence of a wire-level failure: the
    /// server answered `200`, the body was not NDJSON, and `from_utf8_lossy`
    /// below destroys exactly the bytes that name the problem. `hex` is the first
    /// bytes of the first line (`1f8b0800` = gzip magic where JSON was expected,
    /// `7b2274` = `{"t`).
    Head { hex: String, bytes: i64 },
    /// One complete NDJSON line, without its terminating newline.
    Line { line: String },
    /// The last message: every line has already been sent.
    End,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamSummary {
    pub lines: i64,
    pub cancelled: bool,
}

/// What `GET /v2/health` answered, as the Cek button shows it.
///
/// Only a 2xx response becomes one of these; a rejection or a failed connection
/// is a `SyncFailure`, so the two outcomes never overlap.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthReport {
    pub status: u16,
    /// The body, collapsed to one bounded line.
    pub message: String,
}

/// Who is calling, on top of the token.
///
/// The server records these in its request log. Without them a row can only say
/// *which token* called, and every till sharing a token is indistinguishable.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientIdentity {
    pub device_id: String,
    pub request_id: String,
}

/// The identifying headers for one request, already made safe to send.
pub(crate) struct RequestIdentity {
    device_id: String,
    version: String,
    request_id: String,
}

impl RequestIdentity {
    /// `version` comes from the binary itself rather than from the frontend: the
    /// point of the header is to know which build behaved badly.
    pub(crate) fn new(app: &tauri::AppHandle, client: &ClientIdentity) -> Self {
        Self::with_version(client, &app.package_info().version.to_string())
    }

    fn with_version(client: &ClientIdentity, version: &str) -> Self {
        Self {
            device_id: header_safe(&client.device_id, 64),
            version: header_safe(version, 40),
            request_id: header_safe(&client.request_id, 80),
        }
    }
}

/// Restricted to the shapes the server will store (it drops anything else) and
/// bounded, because these values also land in indexed log columns.
fn header_safe(value: &str, max: usize) -> String {
    value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | ':' | '-'))
        .take(max)
        .collect()
}

/// Applies the identifying headers. Empty values are omitted rather than sent
/// blank, so the server records "unknown" instead of "".
pub(crate) fn identify(
    mut builder: reqwest::RequestBuilder,
    who: &RequestIdentity,
) -> reqwest::RequestBuilder {
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
    let version = if version.is_empty() {
        "unknown"
    } else {
        version
    };
    format!("KassirDesktop/{version} ({})", std::env::consts::OS)
}

/// Every failure a command can report. The shape matches the TS
/// `TransportError`, so the sync service can branch on `code` (§16.2).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFailure {
    /// HTTP status, or 0 when the failure happened before/without a response.
    pub status: u16,
    pub code: String,
    pub message: String,
    /// Only on a `410 too_old`: the lowest seq the group still serves (§15.1).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub floor: Option<i64>,
}

impl SyncFailure {
    fn transport(message: String) -> Self {
        Self {
            status: 0,
            code: "transport".to_string(),
            message,
            floor: None,
        }
    }

    fn internal(message: String) -> Self {
        Self {
            status: 0,
            code: "internal".to_string(),
            message,
            floor: None,
        }
    }

    fn bad_group(group: &str) -> Self {
        Self {
            status: 0,
            code: "bad_request".to_string(),
            message: format!("Grup sinkronisasi tidak dikenal: {group}"),
            floor: None,
        }
    }

    fn bad_request(message: &str) -> Self {
        Self {
            status: 0,
            code: "bad_request".to_string(),
            message: message.to_string(),
            floor: None,
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
    #[serde(default)]
    floor: Option<i64>,
}

/// The nine groups the desktop speaks, exactly as the routes name them (§1.4).
///
/// Validated here rather than trusted from the frontend: `group` becomes a path
/// segment, and an unvalidated value could escape the `/v2/` prefix. Keep this
/// list in step with `SYNC_GROUPS` in `src/services/sync/schema.ts` — a group
/// the frontend cycles but this list rejects fails the whole run.
const GROUPS: [&str; 9] = [
    "money", "customer", "supplier", "method", "social", "extra", "product", "combo", "record",
];

fn valid_group(group: &str) -> bool {
    GROUPS.contains(&group)
}

// ============================================================================
// Commands
// ============================================================================

/// Stops a running `sync_pull`/`sync_push`. Not an error: the command returns
/// `StreamSummary { cancelled: true }`.
#[tauri::command]
pub fn sync_cancel(state: tauri::State<'_, SyncState>, id: String) -> Result<(), String> {
    if let Ok(map) = state.cancelled.lock() {
        if let Some(flag) = map.get(&id) {
            flag.store(true, Ordering::SeqCst);
        }
    }
    Ok(())
}

/// `GET /v2/<group>/pull/{after}?limit=N` — one page of changes (§3).
///
/// `after` is the device's bookmark: the highest `seq` it has durably stored, or
/// `0` on first sync. Every NDJSON line is pushed to `channel` as it arrives.
///
/// `count` asks the server to size this group's remaining log (`meta.count`). The
/// frontend sends it on the first page of a pull sequence only: the answer costs
/// the server a scan of the whole remaining range, and it is the difference
/// between a progress bar that knows where it is going and one that infers it
/// from a counter shared by every group.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sync_pull(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    channel: Channel<String>,
    base_url: String,
    token: String,
    group: String,
    after: i64,
    limit: u32,
    count: Option<bool>,
    client: ClientIdentity,
) -> Result<StreamSummary, SyncFailure> {
    if !valid_group(&group) {
        return Err(SyncFailure::bad_group(&group));
    }
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    // The same id names the log row on the server and the cancel flag here.
    let flag = state.register(&client.request_id);
    let outcome = pull_stream(
        &http,
        &flag,
        &who,
        &base_url,
        &token,
        &group,
        after,
        limit,
        count.unwrap_or(false),
        &channel,
    )
    .await;
    state.unregister(&client.request_id);
    outcome
}

/// `POST /v2/money/push` — one batch of row frames, one ack per frame (§7).
///
/// `body` is the batch's NDJSON text (each line `{"e":…,"r":{…}}`,
/// newline-terminated). Content coding is identity: the batch is at most 1000
/// small rows, and the server accepts both, so there is nothing to negotiate.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sync_push(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    channel: Channel<String>,
    base_url: String,
    token: String,
    group: String,
    body: String,
    client: ClientIdentity,
) -> Result<StreamSummary, SyncFailure> {
    if !valid_group(&group) {
        return Err(SyncFailure::bad_group(&group));
    }
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let flag = state.register(&client.request_id);
    let outcome = push_stream(
        &http,
        &flag,
        &who,
        &base_url,
        &token,
        &group,
        body.as_bytes(),
        &channel,
    )
    .await;
    state.unregister(&client.request_id);
    outcome
}

/// `GET /v2/product/one/pull/{product_id}` — one snapshot page for the scoped
/// one-product manual sync (`docs/SYNC-V2-ONE-PRODUCT.md` §2).
///
/// `after` is an opaque cursor from the previous `done.cursor`; `None` starts at
/// the first page. This route has no bookmark and allocates no seq.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sync_product_pull(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    channel: Channel<String>,
    base_url: String,
    token: String,
    product_id: String,
    after: Option<String>,
    limit: u32,
    client: ClientIdentity,
) -> Result<StreamSummary, SyncFailure> {
    if product_id.trim().is_empty() {
        return Err(SyncFailure::bad_request("product_id must not be empty"));
    }
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let flag = state.register(&client.request_id);
    let outcome = pull_one_stream(
        &http,
        &flag,
        &who,
        &base_url,
        &token,
        &product_id,
        after.as_deref(),
        limit,
        &channel,
    )
    .await;
    state.unregister(&client.request_id);
    outcome
}

/// `POST /v2/product/one/push/{product_id}` — the scoped product push
/// (`docs/SYNC-V2-ONE-PRODUCT.md` §3). The body is the same bare-frame NDJSON
/// the normal product push takes; the server refuses a frame outside the scope.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn sync_product_push(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    channel: Channel<String>,
    base_url: String,
    token: String,
    product_id: String,
    body: String,
    client: ClientIdentity,
) -> Result<StreamSummary, SyncFailure> {
    if product_id.trim().is_empty() {
        return Err(SyncFailure::bad_request("product_id must not be empty"));
    }
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    let flag = state.register(&client.request_id);
    let outcome = push_one_stream(
        &http,
        &flag,
        &who,
        &base_url,
        &token,
        &product_id,
        body.as_bytes(),
        &channel,
    )
    .await;
    state.unregister(&client.request_id);
    outcome
}

/// `GET /v2/health` — the Cek button's one question: is this token good for this
/// server right now?
///
/// Not a sync call: nothing is stored and no cancellation flag is registered,
/// because there is no stream to drain. It lives next to pull/push because it
/// answers the same question with the same credentials and headers — a token that
/// passes here is the token those commands will send.
#[tauri::command]
pub async fn sync_health(
    state: tauri::State<'_, SyncState>,
    app: tauri::AppHandle,
    base_url: String,
    token: String,
    client: ClientIdentity,
) -> Result<HealthReport, SyncFailure> {
    let http = state.client();
    let who = RequestIdentity::new(&app, &client);
    health(&http, &who, &base_url, &token).await
}

// ============================================================================
// Internals
// ============================================================================

pub(crate) fn trim_base(base_url: &str) -> &str {
    base_url.trim().trim_end_matches('/')
}

pub(crate) fn transport(error: reqwest::Error) -> SyncFailure {
    // The URL is user-configured, so the message is about the connection, not a
    // raw reqwest chain the cashier could act on.
    log::warn!("sync transport error: {error}");
    SyncFailure::transport(format!("Koneksi ke server gagal: {error}"))
}

pub(crate) fn internal<E: std::fmt::Display>(error: E) -> SyncFailure {
    log::error!("sync internal error: {error}");
    SyncFailure::internal(format!("Kesalahan internal sinkronisasi: {error}"))
}

/// Turns a non-2xx response into the contract's error shape (§4.8, §16.2).
/// Falls back to the HTTP status when the body is not the documented envelope (a
/// proxy or a Cloudflare error page, say).
pub(crate) async fn failure(resp: reqwest::Response) -> SyncFailure {
    let status = resp.status().as_u16();
    let text = resp.text().await.unwrap_or_default();
    match serde_json::from_str::<ErrorEnvelope>(&text) {
        Ok(envelope) => SyncFailure {
            status,
            code: envelope.error.code,
            message: envelope.error.message,
            floor: envelope.error.floor,
        },
        Err(_) => SyncFailure {
            status,
            code: "http_error".to_string(),
            message: if text.trim().is_empty() {
                format!("Server membalas {status}")
            } else {
                text
            },
            floor: None,
        },
    }
}

#[allow(clippy::too_many_arguments)]
async fn pull_stream(
    http: &reqwest::Client,
    flag: &AtomicBool,
    who: &RequestIdentity,
    base_url: &str,
    token: &str,
    group: &str,
    after: i64,
    limit: u32,
    count: bool,
    channel: &Channel<String>,
) -> Result<StreamSummary, SyncFailure> {
    let url = format!(
        "{}/v2/{}/pull/{}?limit={}{}",
        trim_base(base_url),
        group,
        after.max(0),
        limit,
        // `meta.count` — this group's remaining log, which only the first page
        // of a sequence needs and only the server can count.
        if count { "&count=1" } else { "" }
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
async fn push_stream(
    http: &reqwest::Client,
    flag: &AtomicBool,
    who: &RequestIdentity,
    base_url: &str,
    token: &str,
    group: &str,
    body: &[u8],
    channel: &Channel<String>,
) -> Result<StreamSummary, SyncFailure> {
    let url = format!("{}/v2/{}/push", trim_base(base_url), group);
    let resp = identify(
        http.post(url)
            .bearer_auth(token)
            .header(reqwest::header::CONTENT_TYPE, "application/x-ndjson")
            .header(reqwest::header::ACCEPT, "application/x-ndjson")
            .header(reqwest::header::ACCEPT_ENCODING, "gzip"),
        who,
    )
    .body(body.to_vec())
    .send()
    .await
    .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }

    stream_lines(resp, flag, channel).await
}

#[allow(clippy::too_many_arguments)]
async fn pull_one_stream(
    http: &reqwest::Client,
    flag: &AtomicBool,
    who: &RequestIdentity,
    base_url: &str,
    token: &str,
    product_id: &str,
    after: Option<&str>,
    limit: u32,
    channel: &Channel<String>,
) -> Result<StreamSummary, SyncFailure> {
    let mut url = one_product_url(base_url, "pull", product_id)?;
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("limit", &limit.to_string());
        if let Some(after) = after {
            query.append_pair("after", after);
        }
    }
    let resp = identify(
        http.get(url)
            .bearer_auth(token)
            .header(reqwest::header::ACCEPT, "application/x-ndjson")
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
async fn push_one_stream(
    http: &reqwest::Client,
    flag: &AtomicBool,
    who: &RequestIdentity,
    base_url: &str,
    token: &str,
    product_id: &str,
    body: &[u8],
    channel: &Channel<String>,
) -> Result<StreamSummary, SyncFailure> {
    let url = one_product_url(base_url, "push", product_id)?;
    let resp = identify(
        http.post(url)
            .bearer_auth(token)
            .header(reqwest::header::CONTENT_TYPE, "application/x-ndjson")
            .header(reqwest::header::ACCEPT, "application/x-ndjson")
            .header(reqwest::header::ACCEPT_ENCODING, "gzip"),
        who,
    )
    .body(body.to_vec())
    .send()
    .await
    .map_err(transport)?;

    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }

    stream_lines(resp, flag, channel).await
}

/// `{base}/v2/product/one/{action}/{product_id}` with the id as a real path
/// segment. `path_segments_mut` percent-encodes it, so an id containing `:` or
/// `/` cannot escape the prefix.
fn one_product_url(
    base_url: &str,
    action: &str,
    product_id: &str,
) -> Result<reqwest::Url, SyncFailure> {
    let mut url = reqwest::Url::parse(&format!("{}/v2/product/one/{action}", trim_base(base_url)))
        .map_err(|error| SyncFailure::internal(format!("Alamat server tidak valid: {error}")))?;
    url.path_segments_mut()
        .map_err(|_| {
            SyncFailure::internal("Alamat server tidak bisa dipakai sebagai base URL".to_string())
        })?
        .push(product_id);
    Ok(url)
}

/// A health check is a button someone is watching, not a sync that may take a
/// minute: fifteen seconds answers before the operator starts clicking again.
const HEALTH_TIMEOUT: Duration = Duration::from_secs(15);

/// `GET /v2/health` with the same token and identity headers the sync sends.
async fn health(
    http: &reqwest::Client,
    who: &RequestIdentity,
    base_url: &str,
    token: &str,
) -> Result<HealthReport, SyncFailure> {
    let url = format!("{}/v2/health", trim_base(base_url));
    let resp = identify(
        http.get(url)
            .bearer_auth(token)
            .header(reqwest::header::ACCEPT, "application/json")
            .timeout(HEALTH_TIMEOUT),
        who,
    )
    .send()
    .await
    .map_err(transport)?;

    let status = resp.status().as_u16();
    if !resp.status().is_success() {
        return Err(failure(resp).await);
    }
    // A health endpoint's body is informative, not actionable: it is shown on one
    // line next to the button, so a proxy's HTML page must not become a paragraph.
    let body = resp.text().await.unwrap_or_default();
    Ok(HealthReport {
        status,
        message: one_line(&body),
    })
}

/// Whitespace collapsed and bounded, so any body fits the Cek button's one line.
fn one_line(body: &str) -> String {
    body.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(200)
        .collect()
}

/// Reads the body chunk by chunk, cutting it into lines at the newlines. A line
/// split across two chunks is held in `pending` until it completes — the
/// bookmark is a line boundary, so a partial line is never emitted.
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
    channel
        .send(message)
        .map_err(|error| SyncFailure::internal(format!("Gagal mengirim data ke aplikasi: {error}")))
}

fn send_end(channel: &Channel<String>) -> Result<(), SyncFailure> {
    send_event(&StreamEvent::End, channel)
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
    send_event(
        &StreamEvent::Line {
            line: String::from_utf8_lossy(line).into_owned(),
        },
        channel,
    )?;
    *lines += 1;
    Ok(())
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

#[cfg(test)]
mod tests {
    use super::*;

    fn identity() -> RequestIdentity {
        RequestIdentity::with_version(
            &ClientIdentity {
                device_id: "dev-01".to_string(),
                request_id: "req-01".to_string(),
            },
            "1.2.3",
        )
    }

    #[test]
    fn header_values_are_restricted_to_what_the_server_will_store() {
        assert_eq!(header_safe("a b/c\"dé", 20), "abcd");
        assert_eq!(header_safe("abcdef", 3), "abc");
    }

    #[test]
    fn a_missing_version_still_names_the_client() {
        assert!(user_agent("").starts_with("KassirDesktop/unknown ("));
        assert!(user_agent("9.9.9").starts_with("KassirDesktop/9.9.9 ("));
    }

    #[test]
    fn the_head_is_captured_before_the_utf8_decode() {
        // gzip magic where JSON belongs — the exact evidence a real failure left.
        let (hex, bytes) = head_of(&[0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09]);
        assert_eq!(hex, "1f8b080000000000");
        assert_eq!(bytes, 9);
    }

    #[test]
    fn a_short_head_is_not_padded() {
        let (hex, bytes) = head_of(b"{\"t");
        assert_eq!(hex, "7b2274");
        assert_eq!(bytes, 3);
    }

    #[test]
    fn hex_round_trips() {
        assert_eq!(to_hex(&[0x00, 0x0f, 0xa0, 0xff]), "000fa0ff");
    }

    #[test]
    fn the_identity_headers_name_the_install_and_the_call() {
        let who = identity();
        assert_eq!(who.device_id, "dev-01");
        assert_eq!(who.request_id, "req-01");
        assert_eq!(who.version, "1.2.3");
    }

    #[test]
    fn only_the_nine_groups_reach_a_path() {
        for group in [
            "money", "customer", "supplier", "method", "social", "extra", "product", "combo",
            "record",
        ] {
            assert!(valid_group(group), "{group} must reach a /v2/ path");
        }
        // A path segment must not be able to escape `/v2/`.
        assert!(!valid_group("../admin"));
        assert!(!valid_group("money/pull/1"));
        assert!(!valid_group(""));
        assert!(!valid_group("combos"));
    }

    #[test]
    fn a_health_body_is_collapsed_to_one_bounded_line() {
        assert_eq!(one_line("{\n  \"ok\": true\n}\n"), "{ \"ok\": true }");
        assert_eq!(one_line("   \n\t "), "");
        assert_eq!(one_line(&"a".repeat(300)).len(), 200);
    }
}
