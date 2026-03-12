use escposify::printer::Printer;
use printers::{common::base::job::PrinterJobOptions, get_printers as get_system_printers};

use tauri::command;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PrinterInfo {
    name: String,
}

// Command to get a list of available printers
#[command]
pub fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    Ok(get_system_printers()
        .into_iter()
        .map(|p| PrinterInfo { name: p.name })
        .collect())
}

// Command to print a receipt
#[command]
pub fn print_receipt(printer_name: String, receipt_data: String) -> Result<String, String> {
    // Find the printer by name
    let system_printers = get_system_printers();
    let sys_printer = system_printers.into_iter().find(|p| p.name == printer_name);

    let sys_printer = match sys_printer {
        Some(p) => p,
        None => return Err(format!("Printer '{}' not found in system", printer_name)),
    };

    // We write the ESC/POS commands into a memory buffer
    let mut buffer = Vec::new();

    // We create a new scope so the printer drops and flushes its buffer
    {
        let mut escpos_printer = Printer::new(&mut buffer, None, None);

        escpos_printer
            .chain_text(&receipt_data)
            .map_err(|e| format!("Failed to generate ESC/POS text: {}", e))?;

        escpos_printer
            .flush()
            .map_err(|e| format!("Failed to flush ESC/POS buffer: {}", e))?;
    }

    // Now we send the raw bytes to the system printer
    sys_printer
        .print(&buffer, PrinterJobOptions::none())
        .map_err(|e| format!("Failed to send raw data to system printer: {:?}", e))?;

    Ok(format!(
        "Successfully sent receipt data to system printer: {}",
        printer_name
    ))
}
