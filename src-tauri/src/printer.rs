use printers::{common::base::job::PrinterJobOptions, get_printers as get_system_printers};
use printpdf::{self, Base64OrRaw, GeneratePdfOptions, PdfDocument, PdfSaveOptions};
use std::collections::BTreeMap;

use tauri::command;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PrinterInfo {
    name: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ReceiptItem {
    pub name: String,
    pub price: String,
    pub quantity: u32,
    pub total: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Data {
    pub store_name: String,
    pub store_description: String,
    pub store_address: String,
    pub cashier: String,
    pub order_no: String,
    pub date_time: String,
    pub items: Vec<ReceiptItem>,
    pub total_amount: String,
    pub payment_amount: String,
    pub summary_text: String,
    pub payment_method: String,
    pub footer_messages: Vec<String>,
    pub socials: Vec<String>,
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
pub fn print_receipt(printer_name: String, data: Data) -> Result<String, String> {
    // Find the printer by name
    let system_printers = get_system_printers();
    let sys_printer = system_printers.into_iter().find(|p| p.name == printer_name);

    let sys_printer = match sys_printer {
        Some(p) => p,
        None => return Err(format!("Printer '{}' not found in system", printer_name)),
    };

    // We create a new scope so the printer drops and flushes its buffer
    println!("Testing HTML to PDF implementation...");

    let items_html: String = data
        .items
        .iter()
        .map(|item| {
            format!(
                r#"
            <div style="margin-bottom: 5px;">
                <div>{}</div>
                <div style="display: flex; justify-content: space-between;">
                    <span>{:?} &times; {}</span>
                    <span>{:?}.000</span>
                </div>
            </div>
            "#,
                item.name,
                item.price,
                item.quantity,
                item.total
            )
        })
        .collect::<Vec<String>>()
        .join("");

    let footer_msgs_html: String = data
        .footer_messages
        .iter()
        .map(|msg| format!("<div>{}</div>", msg))
        .collect::<Vec<String>>()
        .join("");
    let socials: String = data
        .socials
        .iter()
        .map(|msg| format!("<div>{}</div>", msg))
        .collect::<Vec<String>>()
        .join("");

    let html = format!(
        r#"
        <html>
            <head>
                <style>
                    body {{
                        font-family: 'Roboto';
                        font-size: 12px;
                        width: 300px;
                        margin: 0;
                        padding: 10px;
                        color: #000;
                    }}
                    .center {{ text-align: center; }}
                    .bold {{ font-weight: bold; }}
                    .store-name {{ font-size: 18px; margin-bottom: 2px; }}
                    .separator {{ border-top: 1px dashed #000; margin: 8px 0; }}
                    .flex-row {{ display: flex; justify-content: space-between; }}
                </style>
            </head>
            <body>
                <div class="center">
                    <div class="bold store-name">{}</div>
                    <div>{}</div>
                    <div style="font-size: 11px;">{}</div>
                </div>

                <div style="margin-top: 8px;">
                    <div>Kasir: {}</div>
                    <div class="flex-row">
                        <span>No: {}</span>
                        <span>{}</span>
                    </div>
                </div>

                <div class="separator"></div>

                <div class="items">
                    {}
                </div>

                <div class="separator"></div>

                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 60%;">
                        <div class="flex-row">
                            <span>Total</span>
                            <span>{}</span>
                        </div>
                        <div class="flex-row">
                            <span>Pembayaran</span>
                            <span>{}</span>
                        </div>
                    </div>
                </div>

                <div class="flex-row" style="margin-top: 10px;">
                    <span>{}</span>
                    <span>{}</span>
                </div>

                <div class="center" style="margin-top: 15px; font-size: 11px;">
                    {}
                    <div style="margin-top: 4px;">
                        {}
                    </div>
                </div>
            </body>
        </html>
        "#,
        data.store_name,
        data.store_description,
        data.store_address,
        data.cashier,
        data.order_no,
        data.date_time,
        items_html,
        data.total_amount,
        data.payment_amount,
        data.summary_text,
        data.payment_method,
        footer_msgs_html,
        socials
    );

    // Create PDF from HTML
    let images = BTreeMap::new();
    let mut fonts: BTreeMap<String, Base64OrRaw> = BTreeMap::new();
    // load the roboto font bytes and add it to the fonts map under a name
    let roboto_bytes = include_bytes!("../assets/Roboto-Regular.ttf").to_vec();
    fonts.insert("Roboto".to_string(), Base64OrRaw::Raw(roboto_bytes.clone()));
    let options = GeneratePdfOptions::default();
    let mut warnings = Vec::new();

    println!("Parsing HTML and generating PDF...");

    let doc = match PdfDocument::from_html(&html, &images, &fonts, &options, &mut warnings) {
        Ok(doc) => {
            println!("[OK] Successfully generated PDF");
            if !warnings.is_empty() {
                println!("Warnings:");
                for warn in &warnings {
                    println!("  - {:?}", warn);
                }
            }
            doc
        }
        Err(e) => {
            eprintln!("[ERROR] Failed to generate PDF: {}", e);
            return Err("Error".to_string());
        }
    };

    // Save to file
    let save_options = PdfSaveOptions::default();
    let mut save_warnings = Vec::new();
    let buffer = doc.save(&save_options, &mut save_warnings);

    if !save_warnings.is_empty() {
        println!("Save warnings:");
        for warn in &save_warnings {
            println!("  - {:?}", warn);
        }
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
