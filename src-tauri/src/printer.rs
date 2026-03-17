use std::io::Write;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::command;
use tempfile::NamedTempFile;
use winprint::{
    printer::{FilePrinter, PrinterDevice, WinPdfPrinter},
    ticket::PrintTicket,
};

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PrinterInfo {
    pub name: String,
    pub status: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PrintResult {
    pub success: bool,
    pub message: String,
}

// ============================================================================
// Error Helpers (No additional crates)
// ============================================================================

// ============================================================================
// Commands
// ============================================================================

#[command]
pub fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    let devices =
        PrinterDevice::all().map_err(|e| format!("Failed to enumerate printers: {:?}", e))?;

    if devices.is_empty() {
        return Err(
            "No printers found on this system. Please install a printer first.".to_string(),
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

#[command]
pub fn print_pdf(printer_name: String, pdf_bytes: Vec<u8>) -> Result<String, String> {
    // Validate PDF before doing anything else
    if pdf_bytes.len() < 4 {
        return Err(format!(
            "Invalid PDF: file too small ({} bytes, expected at least 4 bytes for PDF header)",
            pdf_bytes.len()
        ));
    }

    if &pdf_bytes[0..4] != b"%PDF" {
        let header = String::from_utf8_lossy(&pdf_bytes[0..pdf_bytes.len().min(20)]);
        return Err(format!(
            "Invalid PDF: missing PDF header. Found '{:?}' instead of '%PDF'. \
             Make sure you're sending raw PDF bytes, not base64 or JSON. \
             First 20 bytes: {}",
            &pdf_bytes[0..4],
            header
        ));
    }

    // Find the requested printer
    let devices = PrinterDevice::all().map_err(|e| format!("Failed to list printers: {:?}", e))?;

    let device = devices
        .into_iter()
        .find(|p| p.name() == printer_name)
        .ok_or_else(|| {
            let available: Vec<String> = PrinterDevice::all()
                .unwrap_or_default()
                .into_iter()
                .map(|p| format!("'{}'", p.name()))
                .collect();

            format!(
                "Printer '{}' not found. Available printers: [{}]",
                printer_name,
                if available.is_empty() {
                    "none".to_string()
                } else {
                    available.join(", ")
                }
            )
        })?;

    // Write to temp file with detailed error context
    let temp_path = {
        let mut temp = NamedTempFile::with_suffix(".pdf")
            .map_err(|e| format!("Failed to create temp file: {}", e))?;

        temp.write_all(&pdf_bytes)
            .map_err(|e| format!("Failed to write PDF: {}", e))?;
        temp.flush()
            .map_err(|e| format!("Failed to flush: {}", e))?;

        // IMPORTANT: Close the file by persisting it
        let (file, path) = temp
            .keep()
            .map_err(|e| format!("Failed to persist temp file: {}", e))?;
        drop(file); // Explicitly close the handle

        path
    };

    let path_display = temp_path.display().to_string();

    // Now print - file is closed and accessible
    let printer = WinPdfPrinter::new(device);

    // Workaround for Microsoft Print to PDF driver:
    // Use timeout to prevent indefinite hangs on consecutive calls.
    // NOTE: Print happens in background thread. If timeout occurs, the print
    // may still complete in the background (hence saved PDF despite error).
    let path_for_thread = temp_path.clone();
    let printer_name_clone = printer_name.clone();
    let path_display_clone = path_display.clone();
    let pdf_len = pdf_bytes.len();

    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let result = printer.print(&path_for_thread, PrintTicket::default());
        let _ = tx.send(result);
    });

    // Wait for print with 30-second timeout
    let print_result = match rx.recv_timeout(Duration::from_secs(30)) {
        Ok(result) => result,
        Err(mpsc::RecvTimeoutError::Timeout) => {
            let _ = std::fs::remove_file(&temp_path);
            return Err(
                "Print job timed out (Microsoft Print to PDF driver running slowly). \
                 The PDF may still be saved in the background. Check your print queue."
                    .to_string(),
            );
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            let _ = std::fs::remove_file(&temp_path);
            return Err("Print thread crashed (Windows driver error)".to_string());
        }
    };

    print_result.map_err(|e| {
        format!(
            "Print job failed for printer '{}': {:?}. \
         Temp file: '{}', PDF size: {} bytes",
            printer_name_clone, e, path_display_clone, pdf_len
        )
    })?;

    // Small delay to ensure driver releases resources before next call
    // (Microsoft Print to PDF driver quirk workaround)
    thread::sleep(Duration::from_millis(500));

    // Clean up temp file after printing
    let _ = std::fs::remove_file(&temp_path);

    Ok(format!(
        "Successfully sent {} byte PDF to printer '{}'",
        pdf_bytes.len(),
        printer_name
    ))
}
