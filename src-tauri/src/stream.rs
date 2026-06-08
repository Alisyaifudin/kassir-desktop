use futures::StreamExt;
use tauri::ipc::Channel;

#[tauri::command]
pub async fn stream_fetch(url: String, on_chunk: Channel<Vec<u8>>) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch {url}: {e}"))?;

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
            // Frontend dropped the channel, stop streaming
            break;
        }
    }

    Ok(())
}
