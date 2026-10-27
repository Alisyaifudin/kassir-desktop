use std::io::Write;
use tauri::command;
use tempfile::NamedTempFile;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PrinterInfo {
    pub name: String,
    pub status: String,
}

// ============================================================================
// Shared PDF validation
// ============================================================================

/// The sentence shown when the bytes about to reach the spooler are not a PDF.
/// Nothing outside Rust produces them any more, so this firing means the
/// renderer is broken — the cashier gets a sentence, the log gets the detail.
const NOT_A_PDF: &str = "Struk gagal disiapkan. Coba lagi.";

fn validate_pdf(pdf_bytes: &[u8]) -> Result<(), String> {
    if pdf_bytes.len() < 4 {
        return Err(NOT_A_PDF.to_string());
    }

    if &pdf_bytes[0..4] != b"%PDF" {
        // The raw bytes are a developer detail: log them, do not show them.
        log::error!(
            "receipt: the generated buffer is not a PDF ({} bytes starting with {:?})",
            pdf_bytes.len(),
            &pdf_bytes[0..4]
        );
        return Err(NOT_A_PDF.to_string());
    }

    Ok(())
}

/// One sentence the cashier can act on. The OS error behind it is a developer
/// detail: it goes to the app log (Setting > Log), never to the dialog.
const TEMP_FILE_FAILED: &str = "Gagal menyiapkan berkas cetak.";

/// Write PDF bytes to a temporary file, returning its path.
fn write_temp_pdf(pdf_bytes: &[u8]) -> Result<std::path::PathBuf, String> {
    let mut temp = NamedTempFile::with_suffix(".pdf").map_err(|e| {
        log::error!("print_pdf could not create a temp file: {}", e);
        TEMP_FILE_FAILED.to_string()
    })?;

    temp.write_all(pdf_bytes).map_err(|e| {
        log::error!(
            "print_pdf could not write the PDF to {}: {}",
            temp.path().display(),
            e
        );
        TEMP_FILE_FAILED.to_string()
    })?;
    temp.flush().map_err(|e| {
        log::error!("print_pdf could not flush {}: {}", temp.path().display(), e);
        TEMP_FILE_FAILED.to_string()
    })?;

    // IMPORTANT: Close the file by persisting it
    let (file, path) = temp.keep().map_err(|e| {
        log::error!("print_pdf could not persist the temp file: {}", e.error);
        TEMP_FILE_FAILED.to_string()
    })?;
    drop(file); // Explicitly close the handle

    Ok(path)
}

// ============================================================================
// Commands
// ============================================================================
//
// These commands do blocking work: Win32 printer enumeration waits on the
// spooler, a print job can take seconds on a slow or offline printer, and laying
// out a receipt measures and wraps text. A synchronous `#[command]` runs on the
// main thread — the one driving the webview event loop — so the whole POS window
// would freeze right after Bayar, exactly when the cashier needs to start the
// next sale. `spawn_blocking` moves it to the blocking pool instead (the same
// reason `auth.rs` pushes bcrypt there).

#[command]
pub async fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    tauri::async_runtime::spawn_blocking(platform::get_printers)
        .await
        .map_err(|e| {
            log::error!("get_printers task failed: {}", e);
            "Gagal membaca daftar printer. Coba lagi.".to_string()
        })?
}

/// Print a receipt from its data. The receipt is laid out and rendered to a PDF
/// on this side and handed straight to the spooler, so the PDF never crosses the
/// IPC boundary in either direction — the frontend no longer builds one, and it
/// never receives the bytes back.
///
/// This replaced the generic `print_pdf(printer_name, pdf_bytes)` command: once
/// the webview stopped producing PDFs its only caller was gone, and an IPC
/// command that feeds arbitrary bytes to a printer is surface with no purpose.
#[command]
pub async fn print_receipt(
    printer_name: String,
    data: crate::receipt::ReceiptData,
    option: crate::receipt::ReceiptOption,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let pdf_bytes = crate::receipt::render_pdf(&data, &option)?;
        // The renderer is the only producer of these bytes now, but a buffer
        // that is not a PDF must never reach the spooler: it comes out as a
        // wasted roll of paper and no error anyone can act on.
        validate_pdf(&pdf_bytes)?;
        platform::print_pdf(&printer_name, &pdf_bytes)
    })
    .await
    .map_err(|e| {
        log::error!("print_receipt task failed: {}", e);
        "Gagal menjalankan pencetakan. Coba lagi.".to_string()
    })?
}

// ============================================================================
// Windows implementation (winprint)
// ============================================================================

#[cfg(windows)]
mod platform {
    use super::*;
    use winprint::{
        printer::{FilePrinter, PrinterDevice, WinPdfPrinter},
        ticket::PrintTicket,
    };

    pub fn get_printers() -> Result<Vec<PrinterInfo>, String> {
        let devices = PrinterDevice::all().map_err(|e| {
            log::error!("get_printers could not enumerate the spooler: {}", e);
            "Gagal membaca daftar printer. Coba lagi.".to_string()
        })?;

        if devices.is_empty() {
            log::error!("get_printers found no devices in the spooler");
            return Err(
                "Tidak ada printer terpasang. Pasang printer dulu, lalu coba lagi.".to_string(),
            );
        }

        let printers: Vec<PrinterInfo> = devices
            .into_iter()
            .map(|device| PrinterInfo {
                name: device.name().to_string(),
                status: "Ready".to_string(),
            })
            .collect();

        Ok(printers)
    }

    pub fn print_pdf(printer_name: &str, pdf_bytes: &[u8]) -> Result<String, String> {
        // Enumerate the spooler once: the device and the "available printers"
        // message both come from this single (slow) call.
        let devices = PrinterDevice::all().map_err(|e| {
            log::error!("print_pdf could not enumerate the spooler: {}", e);
            "Gagal membaca daftar printer. Coba lagi.".to_string()
        })?;
        let available: Vec<String> = devices.iter().map(|p| p.name().to_string()).collect();

        let device = devices
            .into_iter()
            .find(|p| p.name() == printer_name)
            .ok_or_else(|| {
                // The device list is useful to us and useless (and unreadable) in
                // a 40-column dialog: the log keeps it, the cashier gets a pointer.
                log::error!(
                    "print_pdf: printer '{}' is not installed. Available: [{}]",
                    printer_name,
                    available.join(", ")
                );
                format!(
                    "Printer '{}' tidak ditemukan. Pilih printer lain di Pengaturan > Printer.",
                    printer_name
                )
            })?;

        let temp_path = write_temp_pdf(pdf_bytes)?;

        let printer = WinPdfPrinter::new(device);

        // Now print - file is closed and accessible
        printer
            .print(&temp_path, PrintTicket::default())
            .map_err(|e| {
                let _ = std::fs::remove_file(&temp_path);
                log::error!("print_pdf: the spooler rejected the job: {:?}", e);
                format!("Gagal mengirim ke printer '{}'. Coba lagi.", printer_name)
            })?;

        let _ = std::fs::remove_file(&temp_path);

        // The spooler accepted the job, which is not the same as the paper coming
        // out: say "sent", so the cashier knows to look at the printer. The byte
        // count is a developer detail and belongs in the log, not on a 58 mm
        // receipt's worth of screen space.
        log::info!(
            "print_pdf: {} bytes sent to '{}'",
            pdf_bytes.len(),
            printer_name
        );
        Ok(format!(
            "Dikirim ke printer '{}'. Periksa printer jika kertas tidak keluar.",
            printer_name
        ))
    }
}

// ============================================================================
// Linux / Unix implementation (CUPS via lpstat + lp)
// ============================================================================

#[cfg(not(windows))]
mod platform {
    use super::*;
    use std::process::Command;

    pub fn get_printers() -> Result<Vec<PrinterInfo>, String> {
        let output = Command::new("lpstat").arg("-p").output().map_err(|e| {
            log::error!("get_printers could not run lpstat: {}", e);
            "Tidak bisa membaca daftar printer. Pastikan layanan cetak (CUPS) terpasang."
                .to_string()
        })?;

        let stdout = String::from_utf8_lossy(&output.stdout);

        let printers: Vec<PrinterInfo> = stdout
            .lines()
            .filter_map(|line| {
                let line = line.trim();
                // Example: "printer HP_LaserJet is idle.  enabled since ..."
                let rest = line.strip_prefix("printer ")?;
                let name = rest.split_whitespace().next()?.to_string();

                let status = if rest.contains("is idle") {
                    "Ready"
                } else if rest.contains("disabled") {
                    "Disabled"
                } else if rest.contains("printing") {
                    "Printing"
                } else {
                    "Unknown"
                };

                Some(PrinterInfo {
                    name,
                    status: status.to_string(),
                })
            })
            .collect();

        if printers.is_empty() {
            log::error!("get_printers found no CUPS queues");
            return Err(
                "Tidak ada printer terpasang. Pasang printer dulu, lalu coba lagi.".to_string(),
            );
        }

        Ok(printers)
    }

    pub fn print_pdf(printer_name: &str, pdf_bytes: &[u8]) -> Result<String, String> {
        // Ensure the requested printer exists
        let available = get_printers()?;
        if !available.iter().any(|p| p.name == printer_name) {
            let names: Vec<String> = available.iter().map(|p| p.name.to_string()).collect();
            log::error!(
                "print_pdf: printer '{}' is not installed. Available: [{}]",
                printer_name,
                names.join(", ")
            );
            return Err(format!(
                "Printer '{}' tidak ditemukan. Pilih printer lain di Pengaturan > Printer.",
                printer_name
            ));
        }

        let temp_path = write_temp_pdf(pdf_bytes)?;

        // `lp` sends the PDF to CUPS, which handles PDF rasterization.
        let result = Command::new("lp")
            .arg("-d")
            .arg(printer_name)
            .arg(&temp_path)
            .output();

        let _ = std::fs::remove_file(&temp_path);

        let output = result.map_err(|e| {
            log::error!("print_pdf could not run lp: {}", e);
            "Tidak bisa menjalankan perintah cetak. Pastikan layanan cetak (CUPS) terpasang."
                .to_string()
        })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::error!("print_pdf: lp refused the job: {}", stderr.trim());
            return Err(format!(
                "Gagal mengirim ke printer '{}'. Coba lagi.",
                printer_name
            ));
        }

        // The spooler accepted the job, which is not the same as the paper coming
        // out: say "sent", so the cashier knows to look at the printer. The byte
        // count is a developer detail and belongs in the log, not on a 58 mm
        // receipt's worth of screen space.
        log::info!(
            "print_pdf: {} bytes sent to '{}'",
            pdf_bytes.len(),
            printer_name
        );
        Ok(format!(
            "Dikirim ke printer '{}'. Periksa printer jika kertas tidak keluar.",
            printer_name
        ))
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::validate_pdf;

    // `validate_pdf` is the only gate between a byte buffer and the spooler. The
    // message is what the cashier reads, so the assertion is on the Indonesian
    // sentence, not just `is_err()`.
    const NOT_A_PDF: &str = "Struk gagal disiapkan. Coba lagi.";

    #[test]
    fn a_pdf_header_is_accepted() {
        assert!(validate_pdf(b"%PDF-1.7\n...").is_ok());
    }

    #[test]
    fn exactly_four_bytes_are_enough() {
        // `&pdf_bytes[0..4]` is the whole check, so four bytes is the boundary the
        // `< 4` guard has to admit instead of slicing past the end.
        assert!(validate_pdf(b"%PDF").is_ok());
    }

    #[test]
    fn a_short_buffer_is_refused() {
        assert_eq!(validate_pdf(b"%PD"), Err(NOT_A_PDF.to_string()));
    }

    #[test]
    fn a_non_pdf_buffer_is_refused() {
        assert_eq!(validate_pdf(b"<html>nope"), Err(NOT_A_PDF.to_string()));
    }
}
