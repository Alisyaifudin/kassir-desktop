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

fn validate_pdf(pdf_bytes: &[u8]) -> Result<(), String> {
    if pdf_bytes.len() < 4 {
        return Err("Data yang dikirim bukan PDF yang sah.".to_string());
    }

    if &pdf_bytes[0..4] != b"%PDF" {
        // The raw bytes are a developer detail: log them, do not show them.
        log::error!(
            "print_pdf received a non-PDF buffer of {} bytes starting with {:?}",
            pdf_bytes.len(),
            &pdf_bytes[0..4]
        );
        return Err("Data yang dikirim bukan PDF yang sah.".to_string());
    }

    Ok(())
}

/// Write PDF bytes to a temporary file, returning its path.
fn write_temp_pdf(pdf_bytes: &[u8]) -> Result<std::path::PathBuf, String> {
    let mut temp = NamedTempFile::with_suffix(".pdf")
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    temp.write_all(pdf_bytes)
        .map_err(|e| format!("Failed to write PDF: {}", e))?;
    temp.flush()
        .map_err(|e| format!("Failed to flush: {}", e))?;

    // IMPORTANT: Close the file by persisting it
    let (file, path) = temp
        .keep()
        .map_err(|e| format!("Failed to persist temp file: {}", e))?;
    drop(file); // Explicitly close the handle

    Ok(path)
}

// ============================================================================
// Commands
// ============================================================================
//
// Both commands do blocking work: Win32 printer enumeration waits on the
// spooler, and a print job can take seconds on a slow or offline printer. A
// synchronous `#[command]` runs on the main thread — the one driving the webview
// event loop — so the whole POS window would freeze right after Bayar, exactly
// when the cashier needs to start the next sale. `spawn_blocking` moves it to the
// blocking pool instead (the same reason `auth.rs` pushes bcrypt there).

#[command]
pub async fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    tauri::async_runtime::spawn_blocking(platform::get_printers)
        .await
        .map_err(|e| format!("Gagal membaca daftar printer: {}", e))?
}

#[command]
pub async fn print_pdf(printer_name: String, pdf_bytes: Vec<u8>) -> Result<String, String> {
    // Validate PDF before doing anything else: the bytes stay on this side of the
    // thread hop when they are not a PDF at all.
    validate_pdf(&pdf_bytes)?;
    tauri::async_runtime::spawn_blocking(move || platform::print_pdf(&printer_name, &pdf_bytes))
        .await
        .map_err(|e| format!("Gagal menjalankan pencetakan: {}", e))?
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
        let devices =
            PrinterDevice::all().map_err(|e| format!("Gagal membaca daftar printer: {}", e))?;

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

    pub fn print_pdf(printer_name: &str, pdf_bytes: &[u8]) -> Result<String, String> {
        // Enumerate the spooler once: the device and the "available printers"
        // message both come from this single (slow) call.
        let devices =
            PrinterDevice::all().map_err(|e| format!("Gagal membaca daftar printer: {}", e))?;
        let available: Vec<String> = devices.iter().map(|p| format!("'{}'", p.name())).collect();

        let device = devices
            .into_iter()
            .find(|p| p.name() == printer_name)
            .ok_or_else(|| {
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

        let temp_path = write_temp_pdf(pdf_bytes)?;

        let printer = WinPdfPrinter::new(device);

        // Now print - file is closed and accessible
        printer
            .print(&temp_path, PrintTicket::default())
            .map_err(|e| {
                let _ = std::fs::remove_file(&temp_path);
                e.to_string()
            })?;

        let _ = std::fs::remove_file(&temp_path);

        // The spooler accepted the job, which is not the same as the paper coming
        // out: say "sent", so the cashier knows to look at the printer.
        Ok(format!(
            "Dikirim ke printer '{}' ({} byte)",
            printer_name,
            pdf_bytes.len()
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
        let output = Command::new("lpstat")
            .arg("-p")
            .output()
            .map_err(|e| {
                format!(
                    "Failed to run 'lpstat' (is CUPS installed? e.g. 'sudo apt install cups-client'): {}",
                    e
                )
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
            return Err(
                "No printers found on this system. Please install a printer first.".to_string(),
            );
        }

        Ok(printers)
    }

    pub fn print_pdf(printer_name: &str, pdf_bytes: &[u8]) -> Result<String, String> {
        // Ensure the requested printer exists
        let available = get_printers()?;
        if !available.iter().any(|p| p.name == printer_name) {
            let names: Vec<String> = available.iter().map(|p| format!("'{}'", p.name)).collect();
            return Err(format!(
                "Printer '{}' not found. Available printers: [{}]",
                printer_name,
                names.join(", ")
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
            format!(
                "Failed to run 'lp' (is CUPS installed? e.g. 'sudo apt install cups-client'): {}",
                e
            )
        })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Failed to print to '{}': {}",
                printer_name,
                stderr.trim()
            ));
        }

        // The spooler accepted the job, which is not the same as the paper coming
        // out: say "sent", so the cashier knows to look at the printer.
        Ok(format!(
            "Dikirim ke printer '{}' ({} byte)",
            printer_name,
            pdf_bytes.len()
        ))
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::validate_pdf;

    // `validate_pdf` is the only place IPC-supplied bytes cross into Rust, and
    // the bytes come from the frontend. The message is what the cashier reads,
    // so the assertion is on the Indonesian sentence, not just `is_err()`.
    const NOT_A_PDF: &str = "Data yang dikirim bukan PDF yang sah.";

    #[test]
    fn a_pdf_header_is_accepted() {
        assert!(validate_pdf(b"%PDF-1.7\n...").is_ok());
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
