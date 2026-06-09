use std::collections::HashMap;
use std::sync::Mutex;

use futures::StreamExt;
use tauri::{ipc::Channel, State};
use tokio::sync::{mpsc, oneshot};
use tokio_stream::wrappers::ReceiverStream;

// ============================================================================
// State
// ============================================================================

struct UploadSession {
    tx: mpsc::Sender<Vec<u8>>,
    response_rx: oneshot::Receiver<Result<reqwest::Response, String>>,
}

pub struct UploadState(Mutex<HashMap<String, UploadSession>>);

impl Default for UploadState {
    fn default() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

// ============================================================================
// Commands: Fetch
// ============================================================================

#[tauri::command]
pub async fn stream_fetch(
    url: String,
    on_chunk: Channel<Vec<u8>>,
    on_meta: Channel<Option<u64>>,
    headers: Option<HashMap<String, String>>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut req = client.get(&url);
    if let Some(h) = &headers {
        for (k, v) in h {
            req = req.header(k.as_str(), v.as_str());
        }
    }
    let response = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            // Always send meta — even on connection failure — so the
            // frontend's metaPromise never hangs.
            on_meta.send(None).ok();
            return Err(format!("Failed to fetch {url}: {e}"));
        }
    };

    // Extract file size from custom header, sent BEFORE body chunks.
    // Even on error responses meta arrives so the frontend never hangs
    // waiting for it.
    let size = response
        .headers()
        .get("kassir-file-size")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok());
    on_meta.send(size).ok();

    if !response.status().is_success() {
        return Err(format!(
            "Server returned {} {}",
            response.status().as_u16(),
            response.status().canonical_reason().unwrap_or("Unknown")
        ));
    }

    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {e}"))?;
        if on_chunk.send(chunk.to_vec()).is_err() {
            break;
        }
    }

    Ok(())
}

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UploadResponse {
    pub status: u16,
    pub body: String,
}

#[tauri::command]
pub async fn upload_start(
    state: State<'_, UploadState>,
    url: String,
    headers: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let (tx, rx) = mpsc::channel::<Vec<u8>>(32);
    let (resp_tx, resp_rx) = oneshot::channel();

    let body_stream = ReceiverStream::new(rx).map(|chunk| {
        Ok::<bytes::Bytes, reqwest::Error>(bytes::Bytes::from(chunk))
    });

    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let mut req = client.post(&url);
        if let Some(h) = &headers {
            for (k, v) in h {
                req = req.header(k.as_str(), v.as_str());
            }
        }
        let result = req
            .body(reqwest::Body::wrap_stream(body_stream))
            .send()
            .await
            .map_err(|e| format!("Upload failed: {e}"));
        let _ = resp_tx.send(result);
    });

    let handle = uuid::Uuid::new_v4().to_string();

    state
        .0
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?
        .insert(
            handle.clone(),
            UploadSession {
                tx,
                response_rx: resp_rx,
            },
        );

    Ok(handle)
}

#[tauri::command]
pub async fn upload_chunk(
    state: State<'_, UploadState>,
    handle: String,
    chunk: Vec<u8>,
) -> Result<(), String> {
    let tx = {
        let sessions = state.0.lock().map_err(|e| format!("Lock error: {e}"))?;
        sessions
            .get(&handle)
            .ok_or_else(|| format!("Upload session {handle} not found"))?
            .tx
            .clone()
    };
    tx.send(chunk)
        .await
        .map_err(|e| format!("Failed to send chunk: {e}"))
}

#[tauri::command]
pub async fn upload_end(
    state: State<'_, UploadState>,
    handle: String,
    abort: Option<bool>,
) -> Result<UploadResponse, String> {
    let session = {
        let mut sessions = state.0.lock().map_err(|e| format!("Lock error: {e}"))?;
        sessions
            .remove(&handle)
            .ok_or_else(|| format!("Upload session {handle} not found"))?
    };

    // tx dropped here — reqwest stream receives EOF

    if abort.unwrap_or(false) {
        return Ok(UploadResponse {
            status: 0,
            body: "aborted".into(),
        });
    }

    let response = session
        .response_rx
        .await
        .map_err(|_| "Upload task panicked or was cancelled".to_string())??;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    Ok(UploadResponse { status, body })
}
