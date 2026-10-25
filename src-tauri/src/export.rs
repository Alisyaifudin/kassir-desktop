use std::fs;
use tauri::command;
use tauri_plugin_dialog::DialogExt;

// ============================================================================
// Export (JSON download)
// ============================================================================
//
// The Save dialog and the write both live on this side of the IPC boundary on
// purpose. `src-tauri/capabilities/default.json` narrows `fs:write-files` to
// `$APPDATA/images` and `$APPLOCALDATA/logs`; the fs plugin rejects any other
// path with `PathForbidden`, so a frontend `writeFile` on a location the user
// picked in the Save dialog never worked in a packaged build. Keeping the dialog
// and the write in Rust leaves the ACL narrow *and* the export working, and the
// frontend never names a filesystem path.

#[command]
pub async fn export_file(
    app: tauri::AppHandle,
    default_name: String,
    contents: String,
) -> Result<Option<String>, String> {
    // A save dialog blocks until the user answers it, so it must not run on the
    // main thread (the one driving the webview event loop) — same reason as
    // `printer.rs`.
    tauri::async_runtime::spawn_blocking(move || {
        let picked = app
            .dialog()
            .file()
            .set_title("Simpan Data")
            .set_file_name(default_name)
            .add_filter("JSON", &["json"])
            .blocking_save_file();

        // Cancelling is not an error: nothing is written and nothing is reported.
        let Some(picked) = picked else {
            return Ok(None);
        };

        let path = picked
            .into_path()
            .map_err(|e| format!("Gagal membaca lokasi file: {}", e))?;

        fs::write(&path, contents.as_bytes()).map_err(|e| {
            // The raw OS error is a developer detail: log it, do not render it.
            log::error!("export_file failed writing {}: {}", path.display(), e);
            "Gagal menyimpan file. Coba pilih folder lain.".to_string()
        })?;

        Ok(Some(path.display().to_string()))
    })
    .await
    .map_err(|e| {
        log::error!("export_file task failed: {}", e);
        "Gagal menyimpan file. Coba pilih folder lain.".to_string()
    })?
}
