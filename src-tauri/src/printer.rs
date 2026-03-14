use printers::{common::base::job::PrinterJobOptions, get_printers as get_system_printers};
use printpdf::{self, Base64OrRaw, PdfDocument, PdfSaveOptions};
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
pub fn print_receipt(printer_name: String, data: Data, width_mm: f32) -> Result<String, String> {
    // Find the printer by name
    let system_printers = get_system_printers();
    let sys_printer = system_printers.into_iter().find(|p| p.name == printer_name);

    let sys_printer = match sys_printer {
        Some(p) => p,
        None => return Err(format!("Printer '{}' not found in system", printer_name)),
    };

    log::info!(
        "Generating PDF for printer: {} (width: {}mm)",
        printer_name,
        width_mm
    );

    // Calculate approximate height based on content
    let header_lines = 4;
    let info_lines = 2;
    let item_lines = data.items.len() * 2; // Name line + Price/Qty line
    let footer_lines = data.footer_messages.len() + data.socials.len() + 4;
    let total_lines = header_lines + info_lines + item_lines + footer_lines + 5;

    let line_height_pt = 12.0;
    let _total_height_pt = (total_lines as f32 * line_height_pt) + 40.0; // Add some margin

    let items_html: String = data
        .items
        .iter()
        .map(|item| {
            format!(
                r#"
            <div style="margin-bottom: 5px;">
                <div>{}</div>
                <div style="display: flex; justify-content: space-between;">
                    <span>{} &times; {}</span>
                    <span>{}</span>
                </div>
            </div>
            "#,
                item.name, item.price, item.quantity, item.total
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
                        font-size: 11px;
                        width: {}mm;
                        margin: 0;
                        padding: 5px;
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
        width_mm,
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
    let options = printpdf::GeneratePdfOptions::default();
    let mut warnings = Vec::new();

    log::info!("Parsing HTML and generating PDF...");

    let doc = match PdfDocument::from_html(&html, &images, &fonts, &options, &mut warnings) {
        Ok(doc) => {
            log::info!("[OK] Successfully generated PDF");
            doc
        }
        Err(e) => {
            log::error!("[ERROR] Failed to generate PDF: {}", e);
            return Err("Error generating PDF".to_string());
        }
    };

    // Save PDF to buffer
    let save_options = PdfSaveOptions::default();
    let mut save_warnings = Vec::new();
    let buffer = doc.save(&save_options, &mut save_warnings);

    // Now we send the raw bytes to the system printer
    sys_printer
        .print(&buffer, PrinterJobOptions::none())
        .map_err(|e| format!("Failed to send raw data to system printer: {:?}", e))?;

    Ok(format!(
        "Successfully sent receipt data to system printer: {}",
        printer_name
    ))
}
