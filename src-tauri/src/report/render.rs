//! Pages of positioned text -> one PDF.
//!
//! Everything about *where* a mark goes was decided in `layout.rs`; this file only
//! turns those marks into `printpdf` operations, and it does so with the same two
//! things the receipt does: the faces are parsed once per process and subset to
//! the glyphs the document actually draws.

use printpdf::{
    Color, FontId, Line, LineDashPattern, LinePoint, Op, ParsedFont, PdfDocument, PdfFontHandle,
    PdfPage, PdfSaveOptions, Point, Pt, Rect, Rgb, TextItem,
};

use crate::pdf_text::{face, fonts, subset_face, text_width, ROBOTO_BOLD, ROBOTO_REGULAR};

use super::layout::{LEFT, RIGHT};
use super::{lay_out, Art, Page, ReportData, PAGE_H, PAGE_W};

/// What the operator sees if the PDF could not be built. The cause goes to the
/// app log; a dialog is no place for a font parser error.
const RENDER_FAILED: &str = "Gagal menyiapkan laporan.";

const BLACK: Rgb = Rgb {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    icc_profile: None,
};

/// Every character the pages will draw at one weight.
///
/// This is the whole input to a subset: nothing else can reach a `ShowText`, so a
/// glyph that is not in here cannot appear on paper. Weighted separately because
/// the two faces are subset independently.
fn used_text(pages: &[Page], bold: bool) -> String {
    let mut used = String::new();
    for page in pages {
        for art in &page.art {
            if art.bold == bold {
                used.push_str(&art.text);
            }
        }
    }
    used
}

fn push_text(ops: &mut Vec<Op>, font: &FontId, art: &Art) {
    // One text object per run: `Td` inside a fresh `BT` is an absolute move, so no
    // cursor state has to be carried between marks.
    ops.push(Op::StartTextSection);
    ops.push(Op::SetTextCursor {
        pos: Point {
            x: Pt(art.x as f32),
            y: Pt(art.y as f32),
        },
    });
    ops.push(Op::SetFont {
        font: PdfFontHandle::External(font.clone()),
        size: Pt(art.size as f32),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(art.text.clone())],
    });
    ops.push(Op::EndTextSection);
}

fn push_rule(ops: &mut Vec<Op>, y: f64) {
    ops.push(Op::DrawLine {
        line: Line {
            points: vec![
                LinePoint {
                    p: Point {
                        x: Pt(LEFT as f32),
                        y: Pt(y as f32),
                    },
                    bezier: false,
                },
                LinePoint {
                    p: Point {
                        x: Pt(RIGHT as f32),
                        y: Pt(y as f32),
                    },
                    bezier: false,
                },
            ],
            is_closed: false,
        },
    });
}

/// Draw one page's marks.
fn draw(art: &[Art], rules: &[f64], regular: &FontId, bold: &FontId) -> Vec<Op> {
    let mut ops: Vec<Op> = vec![
        // Black is the only colour the report uses, and both text and rules need it.
        Op::SetFillColor {
            col: Color::Rgb(BLACK),
        },
        Op::SetOutlineColor {
            col: Color::Rgb(BLACK),
        },
        // A hairline. Thicker reads as a header band rather than a separator.
        Op::SetOutlineThickness { pt: Pt(0.6) },
        // Rules are solid; the pattern is graphics state, so it is set once per
        // page rather than per rule and never has to be put back.
        Op::SetLineDashPattern {
            dash: LineDashPattern::solid(),
        },
    ];

    for y in rules {
        push_rule(&mut ops, *y);
    }
    for mark in art {
        let font = if mark.bold { bold } else { regular };
        push_text(&mut ops, font, mark);
    }
    ops
}

/// Subset a face, or carry on with the whole one.
///
/// A slightly fat PDF is a much better outcome than a document that is not
/// produced, so a subset failure is a warning and not an error.
fn subset(raw: &'static [u8], full: &ParsedFont, used: &str, label: &str) -> ParsedFont {
    subset_face(raw, full, used).unwrap_or_else(|| {
        log::warn!("report: could not subset Roboto {label}; embedding the full face");
        full.clone()
    })
}

pub fn render_pdf(data: &ReportData) -> Result<Vec<u8>, String> {
    let faces = fonts(RENDER_FAILED)?;

    // The same advance widths the PDF is embedded with, so a right-aligned rupiah
    // cell lands on the column edge the layout measured it against.
    let measure = |text: &str, size: f64, bold: bool| text_width(face(faces, bold), text, size);
    let pages = lay_out(data, &measure);

    // Subset *after* layout: the layout was measured against the full faces, and a
    // subset does not change the advance of a glyph it keeps, so every position
    // computed above still holds for the smaller font.
    let regular = subset(
        ROBOTO_REGULAR,
        &faces.regular,
        &used_text(&pages, false),
        "Regular",
    );
    let bold_draw = subset(ROBOTO_BOLD, &faces.bold, &used_text(&pages, true), "Bold");

    let mut doc = PdfDocument::new("Laporan Keuangan");
    let regular_id = doc.add_font(&regular);
    let bold_id = doc.add_font(&bold_draw);

    let media = Rect::from_wh(Pt(PAGE_W as f32), Pt(PAGE_H as f32));
    let pdf_pages: Vec<PdfPage> = pages
        .iter()
        .map(|page| {
            let rules: Vec<f64> = page.rules.iter().map(|rule| rule.y).collect();
            PdfPage {
                media_box: media.clone(),
                trim_box: media.clone(),
                crop_box: media.clone(),
                ops: draw(&page.art, &rules, &regular_id, &bold_id),
            }
        })
        .collect();
    doc.with_pages(pdf_pages);

    let mut warnings = Vec::new();
    let bytes = doc.save(&PdfSaveOptions::default(), &mut warnings);
    for warning in &warnings {
        log::warn!("report pdf: {}", warning.msg);
    }

    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn data(rows: usize) -> ReportData {
        ReportData {
            period: "Harian".to_string(),
            range: "14 Maret 2026".to_string(),
            shop: "Toko Contoh".to_string(),
            address: "Jl. Contoh 1".to_string(),
            printed_at: 1_770_000_000_000,
            fix: 0,
            rows: (1..=rows)
                .map(|n| crate::report::CategoryRow {
                    category: "Jual".to_string(),
                    direction: "Masuk".to_string(),
                    lines: n as u32,
                    total: 1_000.0 * n as f64,
                })
                .collect(),
            incoming: 120_000.0,
            outcoming: 40_000.0,
            rounding: 0.0,
            lines: rows as u32,
            unclassified: 0,
            stale: 0,
            excluded: Vec::new(),
            discounts: Vec::new(),
            days: Vec::new(),
        }
    }

    /// The end-to-end seam: a model in, a real PDF out. It cannot say the page
    /// looks right, but it does say every printpdf call was made on a valid
    /// document — a mis-set box or a font-free text section comes back empty or
    /// panics.
    #[test]
    fn a_report_renders_as_a_pdf_document() {
        let bytes = render_pdf(&data(3)).expect("the report should render");

        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 800, "a report is not {} bytes", bytes.len());
    }

    /// The optimization has to be visible in the artefact, not just in a setting:
    /// printpdf's `subset_fonts` default is a no-op without its `text_layout`
    /// feature, so a regression here silently re-embeds both 159 KB faces.
    #[test]
    fn a_report_embeds_only_the_glyphs_it_draws() {
        let bytes = render_pdf(&data(3)).expect("the report should render");

        assert!(
            bytes.len() < 80_000,
            "report pdf is {} bytes — the faces were embedded whole, not subset",
            bytes.len()
        );
    }

    /// The same model twice must produce the same number of pages: nothing in the
    /// layout may depend on the clock or on iteration order. A report whose page
    /// count drifted between two renderings of one day would be unreviewable.
    #[test]
    fn the_same_model_lays_out_the_same_way_twice() {
        let faces = fonts(RENDER_FAILED).expect("fonts");
        let measure = |text: &str, size: f64, bold: bool| text_width(face(faces, bold), text, size);

        let model = data(120);
        let first = lay_out(&model, &measure);
        let second = lay_out(&model, &measure);

        assert_eq!(first.len(), second.len());
        assert!(first.len() > 1, "120 rows should spill past one page");

        for (a, b) in first.iter().zip(second.iter()) {
            let marks = |page: &Page| -> Vec<(String, i64, i64)> {
                page.art
                    .iter()
                    .map(|art| {
                        (
                            art.text.clone(),
                            (art.x * 100.0).round() as i64,
                            (art.y * 100.0).round() as i64,
                        )
                    })
                    .collect()
            };
            assert_eq!(marks(a), marks(b));
        }
    }
}
