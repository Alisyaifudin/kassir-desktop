use printers::{common::base::job::PrinterJobOptions, get_printers as get_system_printers};
use printpdf::*;

use tauri::command;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PrinterInfo {
    name: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Discount {
    pub name: String,
    pub value: String,
}
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Product {
    pub name: String,
    pub price: String,
    pub quantity: u32,
    pub total: String,
    pub discounts: Vec<Discount>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Extra {
    pub name: String,
    pub value: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Data {
    pub store_name: String,
    pub store_description: String,
    pub store_address: String,
    pub cashier: String,
    pub order_no: String,
    pub date_time: String,
    pub products: Vec<Product>,
    pub extras: Vec<Extra>,
    pub subtotal: String,
    pub payment: String,
    pub summary: String,
    pub method: String,
    pub footer_messages: Vec<String>,
    pub socials: Vec<String>,
}

// Command to get a list of available printers
#[command]
pub fn get_printers() -> Vec<PrinterInfo> {
    get_system_printers()
        .into_iter()
        .map(|p| PrinterInfo { name: p.name })
        .collect()
}

static MONO_REGULAR_TTF: &[u8] = include_bytes!("../assets/fonts/SpaceMono-Regular.ttf");
static MONO_BOLD_TTF: &[u8] = include_bytes!("../assets/fonts/SpaceMono-Bold.ttf");
static COLOR_BLACK: Color = Color::Rgb(Rgb {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    icc_profile: None,
});
struct Operation {
    ops: Vec<Op>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RawPoint {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone)]
struct TextOption {
    pub font: PdfFontHandle,
    pub size: Pt,
    pub line_height: Pt,
    pub position: Option<RawPoint>,
}

impl Operation {
    pub fn collect(self) -> Vec<Op> {
        self.ops
    }
    pub fn new() -> Self {
        Self { ops: Vec::new() }
    }
    pub fn save_graphics_state(mut self) -> Self {
        self.ops.push(Op::SaveGraphicsState);
        return self;
    }
    pub fn restore_graphics_state(mut self) -> Self {
        self.ops.push(Op::RestoreGraphicsState);
        return self;
    }
    pub fn add_line_break(mut self) -> Self {
        self.ops.push(Op::AddLineBreak);
        return self;
    }
    pub fn add_text(mut self, text: &str, opt: TextOption) -> Self {
        let ops = vec![
            Op::SetFont {
                font: opt.font,
                size: opt.size,
            },
            Op::SetLineHeight {
                lh: opt.line_height,
            },
            Op::SetFillColor {
                col: COLOR_BLACK.clone(),
            },
            Op::ShowText {
                items: vec![TextItem::Text(text.to_string())],
            },
        ];
        if let Some(pos) = opt.position {
            if self.ops.contains(&Op::StartTextSection) && !self.ops.contains(&Op::EndTextSection) {
                self.ops.push(Op::EndTextSection);
            }
            self.ops.push(Op::StartTextSection);
            self.ops.push(Op::SetTextCursor {
                pos: Point::new(Mm(pos.x), Mm(pos.y)),
            });
        }
        self.ops.extend(ops);

        return self;
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Printer {
    pub name: String,
    pub width: f32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UserDefinedOption {
    pub normal_line_height: f32,
    pub normal_font_size: f32,
    pub big_font_size: f32,
    pub big_line_height: f32,
    pub paper_height: f32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum TextSize {
    Normal,
    Big,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TextData {
    pub size: TextSize,
    pub text: String,
    pub position: Option<RawPoint>,
}

#[command]
pub fn print_receipt(
    printer: Printer,
    data: Vec<TextData>,
    option: UserDefinedOption,
) -> Result<String, String> {
    // Find the printer by name
    let system_printers = get_system_printers();
    let sys_printer = system_printers.into_iter().find(|p| p.name == printer.name);

    let sys_printer = match sys_printer {
        Some(p) => p,
        None => return Err(format!("Printer '{}' not found in system", printer.name)),
    };
    let mut doc = PdfDocument::new("Text Example");
    // We create a new scope so the printer drops and flushes its buffer
    // Load and register an external font
    let mono_regular = ParsedFont::from_bytes(MONO_REGULAR_TTF, 0, &mut Vec::new()).unwrap();
    let mono_regular_id = doc.add_font(&mono_regular);
    let mono_bold = ParsedFont::from_bytes(MONO_BOLD_TTF, 0, &mut Vec::new()).unwrap();
    let mono_bold_id = doc.add_font(&mono_bold);

    let mut ops_builder = Operation::new().save_graphics_state();
    for item in data {
        let opt = match item.size {
            TextSize::Normal => TextOption {
                font: PdfFontHandle::External(mono_regular_id.clone()),
                size: Mm(option.normal_font_size).into_pt(),
                line_height: Mm(option.normal_line_height).into_pt(),
                position: item.position,
            },
            TextSize::Big => TextOption {
                font: PdfFontHandle::External(mono_bold_id.clone()),
                size: Mm(option.big_font_size).into_pt(),
                line_height: Mm(option.big_line_height).into_pt(),
                position: item.position,
            },
        };
        ops_builder = ops_builder.add_text(&item.text, opt).add_line_break();
    }

    // Create a page with our operations
    let ops = ops_builder.restore_graphics_state().collect();
    let page = PdfPage::new(Mm(printer.width), Mm(option.paper_height), ops);

    // Save the PDF to a file
    let bytes = doc
        .with_pages(vec![page])
        .save(&PdfSaveOptions::default(), &mut Vec::new());
    // Now we send the raw bytes to the system printer
    sys_printer
        .print(&bytes, PrinterJobOptions::none())
        .map_err(|e| format!("Failed to send raw data to system printer: {:?}", e))?;

    Ok(format!(
        "Successfully sent receipt data to system printer: {}",
        printer.name
    ))
}
// Command to print
