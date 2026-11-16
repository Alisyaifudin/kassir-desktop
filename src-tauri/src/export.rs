use std::fs;
use tauri::command;
use tauri_plugin_dialog::DialogExt;

// ============================================================================
// Export (file download)
// ============================================================================
//
// The Save dialog and the write both live on this side of the IPC boundary on
// purpose. `src-tauri/capabilities/default.json` narrows `fs:write-files` to
// `$APPDATA/images` and `$APPLOCALDATA/logs`; the fs plugin rejects any other
// path with `PathForbidden`, so a frontend `writeFile` on a location the user
// picked in the Save dialog never worked in a packaged build. Keeping the dialog
// and the write in Rust leaves the ACL narrow *and* the export working, and the
// frontend never names a filesystem path.
//
// Two commands share this body, because two kinds of file leave the app:
//
//   `export_file`   JSON built in the webview  (the record/product exports)
//   `export_bytes`  bytes the webview already holds (a rendered report PDF)
//
// The PDF arrives as `Vec<u8>` over serde's JSON encoding — an array of numbers,
// roughly four times the file. That is the wrong shape for a stream but the right
// shape for a save dialog: it happens once per operator click, on a file of a few
// hundred kilobytes, and it keeps the command a plain typed argument instead of a
// raw IPC body the caller has to construct by hand. Revisit if report PDFs ever
// grow into the megabytes.

/// What the Save dialog is asked for: its title, its one file filter, and the
/// default name's extension.
///
/// A struct rather than three arguments because the two are meaningless apart —
/// a `PDF` filter over a `.json` name is the bug this prevents.
struct Kind {
    title: &'static str,
    label: &'static str,
    extension: &'static str,
}

const JSON_FILE: Kind = Kind {
    title: "Simpan Data",
    label: "JSON",
    extension: "json",
};

const PDF_FILE: Kind = Kind {
    title: "Simpan Laporan",
    label: "PDF",
    extension: "pdf",
};

/// The `kind` argument `export_bytes` accepts, as a `Kind`.
///
/// A string rather than a command per file type: the set of things the app
/// exports is data-driven on the frontend (one save button per format), and the
/// alternative is a new IPC command for every format added. Anything outside the
/// set is refused with a sentence, not a panic.
fn kind_of(kind: &str) -> Result<Kind, String> {
    match kind {
        "json" => Ok(JSON_FILE),
        "pdf" => Ok(PDF_FILE),
        other => {
            log::error!("export_bytes: unknown kind {other:?}");
            Err("Jenis berkas tidak dikenal.".to_string())
        }
    }
}

/// Show the Save dialog and write `bytes` to whatever it returns.
///
/// Blocking by nature — that is why every caller runs it on
/// `spawn_blocking`. Returns `Ok(None)` when the operator cancels, because
/// cancelling is not an error: nothing is written and nothing is reported.
fn save_blocking(
    app: tauri::AppHandle,
    default_name: String,
    kind: Kind,
    bytes: Vec<u8>,
) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .set_title(kind.title)
        .set_file_name(default_name)
        .add_filter(kind.label, &[kind.extension])
        .blocking_save_file();

    let Some(picked) = picked else {
        return Ok(None);
    };

    let path = picked
        .into_path()
        .map_err(|e| format!("Gagal membaca lokasi file: {}", e))?;

    fs::write(&path, bytes).map_err(|e| {
        // The raw OS error is a developer detail: log it, do not render it.
        log::error!("export failed writing {}: {}", path.display(), e);
        "Gagal menyimpan file. Coba pilih folder lain.".to_string()
    })?;

    Ok(Some(path.display().to_string()))
}

/// Run one save on a blocking thread.
///
/// A save dialog blocks until the user answers it, so it must not run on the
/// main thread (the one driving the webview event loop) — same reason as
/// `printer.rs`.
async fn save(
    app: tauri::AppHandle,
    default_name: String,
    kind: Kind,
    bytes: Vec<u8>,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || save_blocking(app, default_name, kind, bytes))
        .await
        .map_err(|e| {
            log::error!("export task failed: {}", e);
            "Gagal menyimpan file. Coba pilih folder lain.".to_string()
        })?
}

/// Text the webview built, as a JSON file.
#[command]
pub async fn export_file(
    app: tauri::AppHandle,
    default_name: String,
    contents: String,
) -> Result<Option<String>, String> {
    save(app, default_name, JSON_FILE, contents.into_bytes()).await
}

/// Bytes the webview already holds — a rendered report PDF — as `kind`'s file.
#[command]
pub async fn export_bytes(
    app: tauri::AppHandle,
    default_name: String,
    kind: String,
    bytes: Vec<u8>,
) -> Result<Option<String>, String> {
    let kind = kind_of(&kind)?;
    save(app, default_name, kind, bytes).await
}
