//! PDF text plumbing shared by the two documents the app produces.
//!
//! Two PDFs leave this app — the receipt (`src/receipt/`) and the financial report
//! (`src/report/`) — and both have to measure text with **the same advances they
//! are embedded with**. A right-aligned rupiah cell that is measured with a
//! different width than the face it is drawn with drifts out of its column, and
//! the drift is invisible until someone counts digits on paper.
//!
//! This module was lifted out of `receipt/render.rs` when the second document
//! arrived. Keeping a private copy in each would have been the smaller edit and
//! the larger bug: a fix to the subsetter or to `text_width` would reach one
//! document and silently not the other.

use std::collections::BTreeSet;
use std::sync::OnceLock;

use allsorts::binary::read::ReadScope;
use allsorts::font_data::FontData;
use allsorts::subset::{CmapTarget, SubsetProfile};
use printpdf::ParsedFont;

// Both faces are `include_bytes!`d, so a packaged build cannot lose them and the
// first print pays no disk I/O.
pub const ROBOTO_REGULAR: &[u8] = include_bytes!("../assets/fonts/Roboto-Regular.ttf");
pub const ROBOTO_BOLD: &[u8] = include_bytes!("../assets/fonts/Roboto-Bold.ttf");

pub struct Fonts {
    pub regular: ParsedFont,
    pub bold: ParsedFont,
}

/// Parsing costs ~1 ms and a document is produced dozens of times a day, so the
/// result is cached for the life of the process.
static FONTS: OnceLock<Option<Fonts>> = OnceLock::new();

/// The two faces, or the sentence to show the operator.
///
/// The cause goes to the app log: a font parser error has no place in a dialog.
pub fn fonts(failure: &'static str) -> Result<&'static Fonts, String> {
    FONTS
        .get_or_init(|| {
            let mut warnings = Vec::new();
            let regular = ParsedFont::from_bytes(ROBOTO_REGULAR, 0, &mut warnings)?;
            let bold = ParsedFont::from_bytes(ROBOTO_BOLD, 0, &mut warnings)?;
            Some(Fonts { regular, bold })
        })
        .as_ref()
        .ok_or_else(|| {
            log::error!("pdf: could not parse the embedded Roboto faces");
            failure.to_string()
        })
}

/// The face to draw (or measure) a run of text with.
pub fn face(fonts: &Fonts, bold: bool) -> &ParsedFont {
    if bold {
        &fonts.bold
    } else {
        &fonts.regular
    }
}

/// What `pdf-lib`'s `heightAtSize` returns: the face's ascent-to-descent span,
/// scaled from font units to points. The row height is the whole gap between two
/// baselines, so this is what a page's budget is built from.
pub fn line_height(font: &ParsedFont, size: f64) -> f64 {
    let span = f64::from(font.font_metrics.ascent) - f64::from(font.font_metrics.descent);
    span / f64::from(font.units_per_em) * size
}

/// `widthOfTextAtSize`: the sum of the glyph advances, scaled to points.
///
/// Kerning is deliberately *not* applied. printpdf writes glyph runs with no `TJ`
/// adjustments, so the advance-width sum is what actually lands on the page —
/// measuring a kerned width instead would make a centred or right-aligned cell
/// drift a hair past where it was measured.
pub fn text_width(font: &ParsedFont, text: &str, size: f64) -> f64 {
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

/// Subset one face down to the glyphs `used` needs.
///
/// The embedded font program is what makes a PDF big: each Roboto face is 159 KB
/// and neither document draws more than a few hundred glyphs from either one.
///
/// `None` means "carry on with the full face": a slightly fat PDF is a much better
/// outcome than a document that is not produced.
pub fn subset_face(raw: &'static [u8], font: &ParsedFont, used: &str) -> Option<ParsedFont> {
    // allsorts wants glyph 0 (.notdef) first and no duplicates. Omitting .notdef
    // does not fail loudly — it renumbers and the first *real* glyph lands in slot
    // 0, so every glyph the document does draw comes out as a missing-glyph box.
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

    // Parse the subset so its cmap maps the same characters to the *new* glyph
    // ids. printpdf derives the content stream, the /W widths and the /ToUnicode
    // from the font it is given; all three have to agree with the embedded
    // program, and this is what keeps them in step.
    let mut warnings = Vec::new();
    ParsedFont::from_bytes(&bytes, 0, &mut warnings)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The two embedded faces are the whole layout of both documents: if they fail
    /// to parse, every row collapses and the PDF is a blank sheet.
    #[test]
    fn the_embedded_faces_parse_with_their_metrics() {
        let fonts = fonts("gagal").expect("both Roboto faces should parse");

        // Roboto's ascent-to-descent span is larger than its point size.
        assert!(line_height(&fonts.regular, 8.0) > 8.0);
        assert!(text_width(&fonts.regular, "Rp100.000", 8.0) > 0.0);
        assert!(text_width(&fonts.bold, "Toko", 10.0) > 0.0);
        // Bold is wider than regular at the same size, which is what makes a
        // bold column header line up with its figures.
        assert!(text_width(&fonts.bold, "Total", 9.0) > text_width(&fonts.regular, "Total", 9.0));
    }

    #[test]
    fn a_subset_keeps_every_character_it_was_handed() {
        let fonts = fonts("gagal").expect("fonts");
        // Every character either document prints: digits, a separator dot, and the
        // uppercase run of a section heading.
        let used = "Rp0123456789.,-KATEGORILAPONU";

        let subset = subset_face(ROBOTO_REGULAR, &fonts.regular, used).expect("subset");

        // The subset's own cmap is what printpdf derives /ToUnicode from, so a
        // character missing here is a missing-glyph box on paper.
        for character in used.chars() {
            assert!(
                subset.codepoint_to_glyph.contains_key(&(character as u32)),
                "{character:?} was dropped from the subset"
            );
        }
        // And the embedded program really is smaller than the face it came from —
        // this is the whole point of subsetting.
        assert!(subset.original_bytes.len() < fonts.regular.original_bytes.len());
    }

    #[test]
    fn a_character_the_face_does_not_have_is_skipped() {
        let fonts = fonts("gagal").expect("fonts");

        // U+4E00 is not in Roboto. It must not reach the subset as a bogus glyph id,
        // and it must not stop the rest of the face from subsetting.
        let subset = subset_face(ROBOTO_REGULAR, &fonts.regular, "Rp\u{4E00}").expect("subset");

        assert!(subset.codepoint_to_glyph.contains_key(&('R' as u32)));
        assert!(!subset.codepoint_to_glyph.contains_key(&0x4E00));
    }
}
