//! Rows -> a one-page PDF.
//!
//! The port of `src/lib/receipt/index.ts`. Two things are worth knowing before
//! touching this:
//!
//! * The page height is *computed* from the laid-out rows, because a thermal
//!   roll has no fixed page: every row adds its own line height to a page that
//!   starts at `padding * 6`. That is why wrapping happens before the page is
//!   created.
//! * Text is measured with the same advance widths the PDF is embedded with, so
//!   wrapping and right-alignment agree with what the printer puts on paper.

use std::collections::BTreeSet;
use std::sync::OnceLock;

use allsorts::binary::read::ReadScope;
use allsorts::font_data::FontData;
use allsorts::subset::{CmapTarget, SubsetProfile};
use printpdf::{
    Color, FontId, Line, LineDashPattern, LinePoint, Op, ParsedFont, PdfDocument, PdfFontHandle,
    PdfPage, PdfSaveOptions, Point, Pt, Rect, Rgb, TextItem,
};

use super::text::{create_receipt_data, Size, TextData};
use super::{ReceiptData, ReceiptOption};

/// pt per mm. The paper width arrives in millimetres (58 or 80) and every other
/// number in this file is a PDF point.
const PT_IN_MM: f64 = 2.83466666667;

/// The smallest gap the two cells of a `spacebetween` row are allowed to close
/// to before the right cell is pushed to the edge instead.
const MINIMAL_GAP: f64 = 5.0;

const BLACK: Rgb = Rgb {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    icc_profile: None,
};

/// The sentence the cashier sees when the receipt could not be built. The cause
/// goes to the app log; a 40-column dialog is no place for a font parser error.
const RENDER_FAILED: &str = "Gagal menyiapkan struk.";

// Both faces are `include_bytes!`d, so a packaged build cannot lose them and the
// first print pays no disk I/O. Parsing is cached: it costs ~1 ms and a receipt
// is printed dozens of times a day.
const ROBOTO_REGULAR: &[u8] = include_bytes!("../../assets/fonts/Roboto-Regular.ttf");
const ROBOTO_BOLD: &[u8] = include_bytes!("../../assets/fonts/Roboto-Bold.ttf");

struct Fonts {
    regular: ParsedFont,
    bold: ParsedFont,
}

static FONTS: OnceLock<Option<Fonts>> = OnceLock::new();

fn fonts() -> Result<&'static Fonts, String> {
    FONTS
        .get_or_init(|| {
            let mut warnings = Vec::new();
            let regular = ParsedFont::from_bytes(ROBOTO_REGULAR, 0, &mut warnings)?;
            let bold = ParsedFont::from_bytes(ROBOTO_BOLD, 0, &mut warnings)?;
            Some(Fonts { regular, bold })
        })
        .as_ref()
        .ok_or_else(|| {
            log::error!("receipt: could not parse the embedded Roboto faces");
            RENDER_FAILED.to_string()
        })
}

struct Style {
    line_height: f64,
    size: f64,
    font: &'static ParsedFont,
}
struct Styles {
    big: Style,
    normal: Style,
}

impl Styles {
    fn get(&self, size: Size) -> &Style {
        match size {
            Size::Big => &self.big,
            Size::Normal => &self.normal,
        }
    }
}

/// Every character the rows will actually draw at one size.
///
/// This is the whole input to a subset: nothing else can reach a `ShowText`, so a
/// glyph that is not in here cannot appear on paper.
fn used_text(rows: &[TextData], want: Size) -> String {
    let mut used = String::new();
    for row in rows {
        match row {
            TextData::Center { size, text }
            | TextData::Long { size, text }
            | TextData::End { size, text } => {
                if *size == want {
                    used.push_str(text);
                }
            }
            TextData::SpaceBetween { size, text, .. } => {
                if *size == want {
                    used.push_str(&text.0);
                    used.push_str(&text.1);
                }
            }
            TextData::LineBreak { .. } | TextData::Line { .. } => {}
        }
    }
    used
}

/// Subset one face down to the glyphs `used` needs.
///
/// The embedded font program is what makes a receipt PDF big: each Roboto face is
/// 159 KB and no receipt draws more than ~70 glyphs from either one, so the two
/// programs (~320 KB, and every byte of it has to be deflated on every print)
/// collapse to a few kilobytes.
///
/// `None` means "carry on with the full face": a slightly fat PDF is a much
/// better outcome than a print that does not happen.
fn subset_face(raw: &'static [u8], font: &ParsedFont, used: &str) -> Option<ParsedFont> {
    // allsorts wants glyph 0 (.notdef) first and no duplicates. Omitting .notdef
    // does not fail loudly — it renumbers and the first *real* glyph lands in slot
    // 0, so every glyph the receipt does draw comes out as a missing-glyph box.
    let ids: BTreeSet<u16> = used
        .chars()
        .filter_map(|character| font.lookup_glyph_index(character as u32))
        .filter(|glyph| *glyph != 0)
        .collect();
    let glyphs: Vec<u16> = std::iter::once(0).chain(ids).collect();

    let scope = ReadScope::new(raw);
    let font_file = scope.read::<FontData<'_>>().ok()?;
    let provider = font_file.table_provider(font.font_index as usize).ok()?;
    let bytes =
        allsorts::subset::subset(&provider, &glyphs, &SubsetProfile::Pdf, CmapTarget::Unicode)
            .ok()?;

    // Parse the subset so its cmap maps the same characters to the *new* glyph ids.
    // printpdf derives the content stream, the /W widths and the /ToUnicode from
    // the font it is given; all three have to agree with the embedded program, and
    // this is what keeps them in step.
    let mut warnings = Vec::new();
    ParsedFont::from_bytes(&bytes, 0, &mut warnings)
}

/// What `pdf-lib`'s `heightAtSize` returns: the face's ascent-to-descent span,
/// scaled from font units to points. The row height is the whole gap between two
/// baselines, so this is what the page height is built from.
fn line_height(font: &ParsedFont, size: f64) -> f64 {
    let span = f64::from(font.font_metrics.ascent) - f64::from(font.font_metrics.descent);
    span / f64::from(font.units_per_em) * size
}

/// `widthOfTextAtSize`: the sum of the glyph advances, scaled to points.
///
/// Kerning is deliberately *not* applied. printpdf writes glyph runs with no
/// `TJ` adjustments, so the advance-width sum is what actually lands on the
/// page — measuring a kerned width instead would make centred rows and the
/// right-hand cell of a `spacebetween` row drift a hair past where they were
/// measured.
fn text_width(font: &ParsedFont, text: &str, size: f64) -> f64 {
    let units: f64 = text
        .chars()
        .map(|character| {
            font.lookup_glyph_index(character as u32)
                .and_then(|glyph| font.get_glyph_width(glyph))
                .map_or(0.0, f64::from)
        })
        .sum();
    units / f64::from(font.units_per_em) * size
}

/// Word-wrap one row. Empty text produces no rows at all, which is what keeps an
/// unset header from eating a line on the roll.
fn split_wrapped_text(
    text: &str,
    max_width: f64,
    font: &ParsedFont,
    font_size: f64,
) -> Vec<String> {
    let tokens: Vec<&str> = text.split_whitespace().collect();
    if tokens.is_empty() {
        return Vec::new();
    }

    let mut lines = Vec::new();
    let mut line = tokens[0].to_string();

    for token in &tokens[1..] {
        let next = format!("{line} {token}");
        if text_width(font, &next, font_size) > max_width {
            lines.push(line);
            line = (*token).to_string();
        } else {
            line = next;
        }
    }

    lines.push(line);
    lines
}

/// Only `center` and `long` rows wrap; everything else is positioned, so it is
/// passed through untouched.
fn expand_wrapped_text_data(
    text_data: Vec<TextData>,
    max_width: f64,
    styles: &Styles,
) -> Vec<TextData> {
    let mut expanded = Vec::with_capacity(text_data.len());

    for row in text_data {
        match row {
            TextData::Center { size, text } => {
                let style = styles.get(size);
                for line in split_wrapped_text(&text, max_width, style.font, style.size) {
                    expanded.push(TextData::Center { size, text: line });
                }
            }
            TextData::Long { size, text } => {
                let style = styles.get(size);
                for line in split_wrapped_text(&text, max_width, style.font, style.size) {
                    expanded.push(TextData::Long { size, text: line });
                }
            }
            other => expanded.push(other),
        }
    }

    expanded
}

/// The roll has no fixed length, so the page is as tall as its rows: a base of
/// `padding * 6` plus one line height per row. This is the number the whole
/// layout hangs off — a row that grows is a row that pushes the footer down.
fn page_height(rows: &[TextData], styles: &Styles, padding: f64) -> f64 {
    let mut height = padding * 6.0;
    for row in rows {
        height += styles.get(row.size()).line_height;
    }
    height
}

fn push_text(ops: &mut Vec<Op>, font: &FontId, x: f64, y: f64, size: f64, text: &str) {
    // One text object per cell: `Td` inside a fresh `BT` is an absolute move, so
    // no cursor state has to be carried between rows.
    ops.push(Op::StartTextSection);
    ops.push(Op::SetTextCursor {
        pos: Point {
            x: Pt(x as f32),
            y: Pt(y as f32),
        },
    });
    ops.push(Op::SetFont {
        font: PdfFontHandle::External(font.clone()),
        size: Pt(size as f32),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(text.to_string())],
    });
    ops.push(Op::EndTextSection);
}

pub fn render_pdf(data: &ReceiptData, option: &ReceiptOption) -> Result<Vec<u8>, String> {
    let fonts = fonts()?;
    let styles = Styles {
        big: Style {
            line_height: line_height(&fonts.bold, option.size.big),
            size: option.size.big,
            font: &fonts.bold,
        },
        normal: Style {
            line_height: line_height(&fonts.regular, option.size.normal),
            size: option.size.normal,
            font: &fonts.regular,
        },
    };

    let paper_width = option.paper_width * PT_IN_MM;
    let max_width = paper_width - 2.0 * option.padding;

    let text_data = create_receipt_data(data, paper_width);
    let expanded = expand_wrapped_text_data(text_data, max_width, &styles);
    let paper_height = page_height(&expanded, &styles, option.padding);

    let mut doc = PdfDocument::new("Struk");

    // The faces are subset *after* layout: wrapping is measured against the full
    // ones (a subset only carries the glyphs it was handed), and subsetting does
    // not change the advance of a glyph it keeps, so the positions computed above
    // still hold for the smaller font.
    let regular_draw = subset_face(
        ROBOTO_REGULAR,
        &fonts.regular,
        &used_text(&expanded, Size::Normal),
    )
    .unwrap_or_else(|| {
        log::warn!("receipt: could not subset Roboto Regular; embedding the full face");
        fonts.regular.clone()
    });
    let bold_draw = subset_face(ROBOTO_BOLD, &fonts.bold, &used_text(&expanded, Size::Big))
        .unwrap_or_else(|| {
            log::warn!("receipt: could not subset Roboto Bold; embedding the full face");
            fonts.bold.clone()
        });

    let regular_id = doc.add_font(&regular_draw);
    let bold_id = doc.add_font(&bold_draw);

    let mut ops: Vec<Op> = Vec::new();
    // Black is the only colour a receipt uses, and both text and rules need it.
    ops.push(Op::SetFillColor {
        col: Color::Rgb(BLACK),
    });
    ops.push(Op::SetOutlineColor {
        col: Color::Rgb(BLACK),
    });
    ops.push(Op::SetOutlineThickness { pt: Pt(1.0) });

    let mut cursor_y = paper_height - option.padding;

    for row in &expanded {
        let size = row.size();
        let style = styles.get(size);
        let font = match size {
            Size::Big => &bold_id,
            Size::Normal => &regular_id,
        };
        // Every row starts from the left padding; only the variants that align
        // differently move it.
        let cursor_x = option.padding;

        match row {
            TextData::Center { text, .. } => {
                let line_width = text_width(style.font, text, style.size);
                let x = option.padding + (max_width - line_width).max(0.0) / 2.0;
                cursor_y -= style.line_height;
                push_text(&mut ops, font, x, cursor_y, style.size, text);
            }
            TextData::Long { text, .. } => {
                cursor_y -= style.line_height;
                push_text(&mut ops, font, cursor_x, cursor_y, style.size, text);
            }
            TextData::End { text, .. } => {
                // Right-aligned by measuring the word, not by the column: the
                // old layout allowed this to overhang, and a receipt that shifts
                // one rupiah cell is better than one that truncates it.
                let word_width = text_width(style.font, text, style.size);
                let remaining_space = paper_width - word_width - option.padding;
                cursor_y -= style.line_height;
                push_text(&mut ops, font, remaining_space, cursor_y, style.size, text);
            }
            TextData::SpaceBetween { text, x, .. } => {
                let (first, second) = text;
                let preferred_x = x.unwrap_or(0.0);
                let first_width = text_width(style.font, first, style.size);
                let second_width = text_width(style.font, second, style.size);
                let remaining = paper_width - first_width - second_width - 2.0 * option.padding;
                let remaining_preferred = remaining - preferred_x;

                let mut x = preferred_x + option.padding;
                let mut space_between = remaining_preferred;
                if remaining_preferred < MINIMAL_GAP {
                    if x + remaining > MINIMAL_GAP {
                        x += remaining;
                        space_between = MINIMAL_GAP;
                    } else {
                        x = 0.0;
                    }
                }

                cursor_y -= style.line_height;
                push_text(&mut ops, font, x, cursor_y, style.size, first);
                push_text(
                    &mut ops,
                    font,
                    x + space_between + first_width,
                    cursor_y,
                    style.size,
                    second,
                );
            }
            TextData::LineBreak { .. } => {
                cursor_y -= style.line_height;
            }
            TextData::Line { x, .. } => {
                let start_x = x.unwrap_or(option.padding);
                cursor_y -= style.line_height;
                ops.push(Op::SetLineDashPattern {
                    dash: LineDashPattern::new(0.0, &[4.0, 2.0]),
                });
                ops.push(Op::DrawLine {
                    line: Line {
                        points: vec![
                            LinePoint {
                                p: Point {
                                    x: Pt(start_x as f32),
                                    y: Pt(cursor_y as f32),
                                },
                                bezier: false,
                            },
                            LinePoint {
                                p: Point {
                                    x: Pt((paper_width - option.padding) as f32),
                                    y: Pt(cursor_y as f32),
                                },
                                bezier: false,
                            },
                        ],
                        is_closed: false,
                    },
                });
                // The pattern is graphics state and would outlive this rule.
                ops.push(Op::SetLineDashPattern {
                    dash: LineDashPattern::solid(),
                });
            }
        }
    }

    let media = Rect::from_wh(Pt(paper_width as f32), Pt(paper_height as f32));
    let page = PdfPage {
        media_box: media.clone(),
        trim_box: media.clone(),
        crop_box: media,
        ops,
    };
    doc.with_pages(vec![page]);

    let mut warnings = Vec::new();
    let bytes = doc.save(&PdfSaveOptions::default(), &mut warnings);
    for warning in &warnings {
        log::warn!("receipt pdf: {}", warning.msg);
    }

    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::receipt::{Info, Record, SizeOption};

    fn option() -> ReceiptOption {
        ReceiptOption {
            paper_width: 58.0,
            padding: 5.0,
            size: SizeOption {
                normal: 8.0,
                big: 10.0,
            },
        }
    }

    fn data() -> ReceiptData {
        ReceiptData {
            record: Record {
                id: "01-record".to_string(),
                created_at: 1_700_000_000_000,
                paid_at: Some(1_700_000_000_000),
                credit_at: None,
                cashier: "siti".to_string(),
                fix: 0.0,
                sub_total: 100_500.0,
                total: 100_500.0,
                grand_total: 100_500.0,
                change: 0.0,
                pay: 100_500.0,
                rounding: 0.0,
                methods: Vec::new(),
            },
            products: Vec::new(),
            extras: Vec::new(),
            info: Info {
                owner: "Toko Contoh".to_string(),
                header: "Struk".to_string(),
                address: "Jl. Contoh 1".to_string(),
                footer: "Terima kasih".to_string(),
                show_cashier: true,
            },
            socials: Vec::new(),
        }
    }

    /// The two embedded faces are the whole layout: if they fail to parse, every
    /// row collapses and the receipt prints as an empty sheet. `pdf-lib` used to
    /// take the same bytes through `?arraybuffer`, so this is the seam that moved.
    #[test]
    fn the_embedded_faces_parse_with_their_metrics() {
        let fonts = fonts().expect("both Roboto faces should parse");

        // Roboto's ascent-to-descent span is larger than its point size.
        assert!(line_height(&fonts.regular, 8.0) > 8.0);
        assert!(text_width(&fonts.regular, "Rp100.000", 8.0) > 0.0);
        assert!(text_width(&fonts.bold, "Toko", 10.0) > 0.0);
    }

    #[test]
    fn wrapping_keeps_every_line_inside_the_roll() {
        let fonts = fonts().expect("fonts");
        let option = option();
        let max_width = option.paper_width * PT_IN_MM - 2.0 * option.padding;
        let text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at congue massa, in pharetra diam.";

        let lines = split_wrapped_text(text, max_width, &fonts.regular, option.size.normal);

        assert!(lines.len() > 1, "a product name this long has to wrap");
        for line in &lines {
            assert!(
                text_width(&fonts.regular, line, option.size.normal) <= max_width,
                "{line:?} is wider than the printable width"
            );
        }
        // Wrapping only moves words around; it never drops or repeats one.
        assert_eq!(lines.join(" "), text);
    }

    #[test]
    fn an_empty_row_produces_no_lines() {
        let fonts = fonts().expect("fonts");
        assert!(split_wrapped_text("   ", 100.0, &fonts.regular, 8.0).is_empty());
        assert!(split_wrapped_text("", 100.0, &fonts.regular, 8.0).is_empty());
    }

    /// The end-to-end seam: rows in, a real PDF out. It cannot say the page looks
    /// right, but it does say every printpdf call was made on a valid document
    /// (a mis-set page or a font-free text section comes back empty or panics).
    #[test]
    fn a_receipt_renders_as_a_pdf_document() {
        let bytes = render_pdf(&data(), &option()).expect("the receipt should render");

        assert!(bytes.starts_with(b"%PDF-"));
        assert!(
            bytes.len() > 800,
            "a receipt with a header, totals and a footer is not {} bytes",
            bytes.len()
        );
    }

    /// The optimization has to be visible in the artefact, not just in a setting:
    /// printpdf's `subset_fonts` default is a no-op without its `text_layout`
    /// feature, so a regression here silently re-embeds both 159 KB faces and
    /// nobody notices until the spooler does.
    #[test]
    fn a_receipt_embeds_only_the_glyphs_it_draws() {
        let bytes = render_pdf(&data(), &option()).expect("the receipt should render");

        assert!(
            bytes.len() < 60_000,
            "receipt pdf is {} bytes — the faces were embedded whole, not subset",
            bytes.len()
        );
    }

    fn styles() -> Styles {
        let fonts = fonts().expect("fonts");
        Styles {
            big: Style {
                line_height: line_height(&fonts.bold, 10.0),
                size: 10.0,
                font: &fonts.bold,
            },
            normal: Style {
                line_height: line_height(&fonts.regular, 8.0),
                size: 8.0,
                font: &fonts.regular,
            },
        }
    }

    /// The roll has no fixed page, so every row the receipt adds is a row of paper
    /// the printer has to feed. This is the one number that decides how long the
    /// slip is, and it is computed from the fonts rather than hardcoded.
    #[test]
    fn the_page_grows_by_one_row_height_per_row() {
        let styles = styles();
        let padding = 5.0;
        let base = padding * 6.0;

        assert_eq!(page_height(&[], &styles, padding), base);

        let normal = TextData::LineBreak { size: Size::Normal };
        assert_eq!(
            page_height(std::slice::from_ref(&normal), &styles, padding),
            base + styles.normal.line_height
        );

        let big = TextData::Center {
            size: Size::Big,
            text: "Toko Contoh".to_string(),
        };
        assert_eq!(
            page_height(&[normal, big], &styles, padding),
            base + styles.normal.line_height + styles.big.line_height
        );
    }

    #[test]
    fn a_wrapped_product_name_makes_the_page_taller() {
        let styles = styles();
        let option = option();
        let max_width = option.paper_width * PT_IN_MM - 2.0 * option.padding;

        let short = expand_wrapped_text_data(
            vec![TextData::Long {
                size: Size::Normal,
                text: "Kopi".to_string(),
            }],
            max_width,
            &styles,
        );
        let long = expand_wrapped_text_data(
            vec![TextData::Long {
                size: Size::Normal,
                text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
            }],
            max_width,
            &styles,
        );

        // One short row stays one row; the long name is split, and every extra row
        // is extra paper.
        assert_eq!(short.len(), 1);
        assert!(long.len() > 1, "this name does not fit on one 58 mm line");
        assert!(
            page_height(&long, &styles, option.padding)
                > page_height(&short, &styles, option.padding)
        );
    }
}
