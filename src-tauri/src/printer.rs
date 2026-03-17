use std::io::Write;
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

    let printer = WinPdfPrinter::new(device);

    // Now print - file is closed and accessible
    printer
        .print(&temp_path, PrintTicket::default())
        .map_err(|e| {
            let _ = std::fs::remove_file(&temp_path);
            e.to_string()
        })?;

    let _ = std::fs::remove_file(&temp_path);

    Ok(format!(
        "Successfully sent {} byte PDF to printer '{}'",
        pdf_bytes.len(),
        printer_name
    ))
}
