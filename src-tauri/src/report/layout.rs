//! A `ReportData` in, pages of positioned text out.
//!
//! No `printpdf` and no font parsing here: text is measured through the `measure`
//! callback the caller supplies, so this whole file — the page breaks, the repeated
//! header, the right-aligned columns, the footer's `Halaman 2 dari 3` — is covered
//! by ordinary `cargo test` with a ruler instead of a renderer.

use crate::report::{CategoryRow, DayRow, ExcludedRow, ReportData};

/// A4 portrait, in PostScript points (`595.28 × 841.89`).
pub const PAGE_W: f64 = 595.276;
pub const PAGE_H: f64 = 841.89;

/// The printable box. The bottom margin is generous because a printed page needs
/// air under the last rule for a stapler, not because the layout wants it.
const MARGIN_X: f64 = 48.0;
const MARGIN_TOP: f64 = 56.0;
const MARGIN_BOTTOM: f64 = 56.0;

pub const LEFT: f64 = MARGIN_X;
pub const RIGHT: f64 = PAGE_W - MARGIN_X;
const TOP: f64 = PAGE_H - MARGIN_TOP;
const BOTTOM: f64 = MARGIN_BOTTOM;

// Column edges for the detail table. `_R` means "the right edge the cell is
// aligned to"; money sits flush right, the count just before it.
const COL_DIRECTION: f64 = 330.0;
const COL_LINES_R: f64 = 470.0;
const COL_TOTAL_R: f64 = RIGHT;

// The type scale. One size per role rather than a per-call argument, so a
// `Halaman` footer cannot end up larger than a section heading.
const S_SHOP: f64 = 16.0;
const S_HEADING: f64 = 13.0;
const S_SUBTITLE: f64 = 10.0;
const S_SECTION: f64 = 10.0;
const S_BODY: f64 = 9.0;
const S_NOTE: f64 = 7.5;

/// Baseline step for a body row.
const ROW: f64 = 13.5;
/// Vertical air between two blocks of the document.
const BLOCK_GAP: f64 = 14.0;

/// One run of text on a page, positioned by its baseline.
#[derive(Debug, Clone, PartialEq)]
pub struct Art {
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub size: f64,
    pub bold: bool,
}

/// A full-width horizontal rule. The report only ever draws these edge to edge.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rule {
    pub y: f64,
}

/// One page's worth of marks.
#[derive(Debug, Clone, Default)]
pub struct Page {
    pub art: Vec<Art>,
    pub rules: Vec<Rule>,
}

/// Text measuring, supplied by the caller: `(text, size, bold) -> width in pt`.
///
/// This is the only thing that ties the layout to a font, and it is a parameter
/// so that a test can pass a predictable ruler and a renderer can pass the real
/// one (the same advance widths the PDF is embedded with).
pub type Measure<'a> = &'a dyn Fn(&str, f64, bool) -> f64;

/// Where the pen is, and which page it is writing to.
struct Flow<'a> {
    measure: Measure<'a>,
    pages: Vec<Page>,
    page: Page,
    /// The baseline of the next line to draw.
    y: f64,
}

impl<'a> Flow<'a> {
    fn new(measure: Measure<'a>) -> Self {
        Self {
            measure,
            pages: Vec::new(),
            page: Page::default(),
            y: TOP,
        }
    }

    fn width(&self, text: &str, size: f64, bold: bool) -> f64 {
        (self.measure)(text, size, bold)
    }

    /// Draw at the current baseline, left-aligned to `LEFT`.
    fn left(&mut self, text: &str, size: f64, bold: bool) {
        self.at(text, size, bold, LEFT);
    }

    /// Draw at the current baseline, left-aligned to an arbitrary x.
    fn at(&mut self, text: &str, size: f64, bold: bool, x: f64) {
        if text.is_empty() {
            return;
        }
        self.page.art.push(Art {
            text: text.to_string(),
            x,
            y: self.y,
            size,
            bold,
        });
    }

    /// Draw at the current baseline, right-aligned so the text ends at `edge`.
    fn right(&mut self, text: &str, size: f64, bold: bool, edge: f64) {
        let x = edge - self.width(text, size, bold);
        self.at(text, size, bold, x);
    }

    /// A rule on the current baseline, spanning the printable width.
    fn rule(&mut self) {
        self.page.rules.push(Rule { y: self.y });
    }

    fn step(&mut self, by: f64) {
        self.y -= by;
    }

    /// Whether a block of `height` still fits above the bottom margin.
    fn fits(&self, height: f64) -> bool {
        self.y - height >= BOTTOM
    }

    /// Close the current page and start another at the top margin.
    fn page_break(&mut self) {
        let finished = std::mem::take(&mut self.page);
        self.pages.push(finished);
        self.y = TOP;
    }

    fn finish(mut self) -> Vec<Page> {
        self.pages.push(self.page);
        self.pages
    }
}

fn money(value: f64, fix: u32) -> String {
    crate::receipt::format::format_money(value, f64::from(fix))
}

fn printed_at(epoch_ms: i64) -> String {
    use chrono::TimeZone;
    chrono::Local
        .timestamp_millis_opt(epoch_ms)
        .single()
        .map(|at| at.format("%d-%m-%Y %H:%M").to_string())
        .unwrap_or_default()
}

/// The masthead, the period, and the three figures that summarise it.
fn heading(flow: &mut Flow<'_>, data: &ReportData) {
    flow.left(&data.shop, S_SHOP, true);
    flow.step(ROW);
    if !data.address.is_empty() {
        flow.left(&data.address, S_BODY, false);
        flow.step(ROW);
    }

    flow.step(BLOCK_GAP);
    flow.rule();
    flow.step(ROW);
    flow.left("LAPORAN KEUANGAN", S_HEADING, true);
    flow.right(&data.period, S_SUBTITLE, false, RIGHT);
    flow.step(ROW);
    flow.right(&data.range, S_SUBTITLE, false, RIGHT);
    // The range is right-aligned above; the period label shares its line, so the
    // heading line carries `LAPORAN KEUANGAN` on the left and the period on the
    // right, and the range gets the next line to itself.

    flow.step(BLOCK_GAP);
    summary(flow, data);
}

/// The three totals, laid out as a small right-aligned block so the eye can
/// compare them without reading a table.
fn summary(flow: &mut Flow<'_>, data: &ReportData) {
    let fix = data.fix;
    let lines: [(&str, String); 3] = [
        ("Masuk", money(data.incoming, fix)),
        ("Keluar", money(data.outcoming, fix)),
        ("Selisih", money(data.incoming - data.outcoming, fix)),
    ];
    for (label, value) in lines {
        flow.left(label, S_BODY, false);
        flow.right(&value, S_BODY, true, COL_TOTAL_R);
        flow.step(ROW);
    }
}

/// The detail table's column labels, plus the rule that separates them from the
/// rows. Redrawn on every page the table spills onto, so a sheet of figures always
/// says which column is which.
fn detail_header(flow: &mut Flow<'_>) {
    flow.step(BLOCK_GAP);
    flow.left("Rincian", S_SECTION, true);
    flow.step(ROW);
    flow.left("Kategori", S_BODY, true);
    flow.at("Arah", S_BODY, true, COL_DIRECTION);
    flow.right("Baris", S_BODY, true, COL_LINES_R);
    flow.right("Total", S_BODY, true, COL_TOTAL_R);
    flow.step(6.0);
    flow.rule();
    flow.step(ROW - 6.0);
}

fn detail_row(flow: &mut Flow<'_>, data: &ReportData, row: &CategoryRow) {
    flow.left(&row.category, S_BODY, false);
    flow.at(&row.direction, S_BODY, false, COL_DIRECTION);
    flow.right(&row.lines.to_string(), S_BODY, false, COL_LINES_R);
    flow.right(&money(row.total, data.fix), S_BODY, false, COL_TOTAL_R);
    flow.step(ROW);
}

fn detail(flow: &mut Flow<'_>, data: &ReportData) {
    detail_header(flow);
    if data.rows.is_empty() {
        flow.left("Belum ada baris yang diklasifikasi.", S_BODY, false);
        flow.step(ROW);
        return;
    }

    for row in &data.rows {
        // A row that does not fit starts a new page, and the new page gets the
        // header again — a continuation sheet with unnamed columns is a sheet
        // nobody can read.
        if !flow.fits(ROW) {
            flow.page_break();
            detail_header(flow);
        }
        detail_row(flow, data, row);
    }
}

/// The totals block. It is measured as one lump and moved to the next page whole:
/// `Total Masuk` separated from `Total Keluar` is worse than a page that ends
/// early.
/// The three figures the totals block prints, in order.
fn total_rows(data: &ReportData) -> [(&'static str, String); 3] {
    let fix = data.fix;
    [
        ("Total Masuk", money(data.incoming, fix)),
        ("Total Keluar", money(data.outcoming, fix)),
        // Reported apart from the categories, so the two still reconcile.
        ("Pembulatan", money(data.rounding, fix)),
    ]
}

/// How tall the totals block is: the rule, the three figures, the line count, and
/// one memo row per direction that gave a discount.
fn totals_height(data: &ReportData) -> f64 {
    6.0 + ROW * (1.0 + total_rows_rows() + 1.0 + data.discounts.len() as f64)
}

const fn total_rows_rows() -> f64 {
    3.0
}

fn totals(flow: &mut Flow<'_>, data: &ReportData) {
    let rows = total_rows(data);
    if !flow.fits(totals_height(data)) {
        flow.page_break();
    }

    flow.step(6.0);
    flow.rule();
    flow.step(ROW);
    for (label, value) in rows {
        flow.left(label, S_BODY, true);
        flow.right(&value, S_BODY, true, COL_TOTAL_R);
        flow.step(ROW);
    }

    flow.left("Jumlah baris", S_BODY, false);
    flow.right(&data.lines.to_string(), S_BODY, false, COL_LINES_R);
    flow.step(ROW);

    // A memo, not a subtotal: every category above is already net of these. The
    // label says so, because a figure sitting under a total is read as part of it.
    for row in &data.discounts {
        flow.left("Diskon baris (sudah dikurangkan)", S_BODY, false);
        flow.at(&row.direction, S_BODY, false, COL_DIRECTION);
        flow.right(&row.entries.to_string(), S_BODY, false, COL_LINES_R);
        flow.right(&money(row.total, data.fix), S_BODY, false, COL_TOTAL_R);
        flow.step(ROW);
    }
}

/// One row per day. Only drawn for a period report — a single day's report would
/// be a table of one, saying nothing the heading has not.
fn per_day(flow: &mut Flow<'_>, data: &ReportData) {
    if data.days.is_empty() {
        return;
    }

    let header_height = BLOCK_GAP + ROW * 2.0;
    if !flow.fits(header_height) {
        flow.page_break();
    }

    flow.step(BLOCK_GAP);
    flow.left("Per hari", S_SECTION, true);
    flow.step(ROW);
    flow.left("Tanggal", S_BODY, true);
    flow.at("Rekaman", S_BODY, true, COL_DIRECTION);
    flow.right("Belum jelas", S_BODY, true, COL_LINES_R);
    flow.right("Berubah", S_BODY, true, COL_TOTAL_R);
    flow.step(6.0);
    flow.rule();
    flow.step(ROW - 6.0);

    for row in &data.days {
        if !flow.fits(ROW) {
            flow.page_break();
        }
        day_row(flow, row);
    }
}

fn day_row(flow: &mut Flow<'_>, row: &DayRow) {
    flow.left(&row.label, S_BODY, false);
    flow.at(&row.records.to_string(), S_BODY, false, COL_DIRECTION);
    flow.right(&row.unclassified.to_string(), S_BODY, false, COL_LINES_R);
    flow.right(&row.stale.to_string(), S_BODY, false, COL_TOTAL_R);
    flow.step(ROW);
}

/// The lines the report leaves out, by name and amount.
///
/// Deliberately a table and not a sentence: "3 baris dikecualikan" leaves the
/// operator unable to check *which*, and the whole point of a report is being able
/// to check. Drawn before the notes so the qualifiers stay last.
fn excluded(flow: &mut Flow<'_>, data: &ReportData) {
    if data.excluded.is_empty() {
        return;
    }

    if !flow.fits(BLOCK_GAP + ROW * 2.0) {
        flow.page_break();
    }
    flow.step(BLOCK_GAP);
    flow.left("Dikecualikan dari laporan", S_SECTION, true);
    flow.step(ROW);
    flow.left("Nama", S_BODY, true);
    flow.at("Arah", S_BODY, true, COL_DIRECTION);
    flow.right("Baris", S_BODY, true, COL_LINES_R);
    flow.right("Nilai", S_BODY, true, COL_TOTAL_R);
    flow.step(6.0);
    flow.rule();
    flow.step(ROW - 6.0);

    for row in &data.excluded {
        if !flow.fits(ROW) {
            flow.page_break();
        }
        excluded_row(flow, data, row);
    }
}

fn excluded_row(flow: &mut Flow<'_>, data: &ReportData, row: &ExcludedRow) {
    flow.left(&row.name, S_BODY, false);
    flow.at(&row.direction, S_BODY, false, COL_DIRECTION);
    flow.right("1", S_BODY, false, COL_LINES_R);
    flow.right(&money(row.total, data.fix), S_BODY, false, COL_TOTAL_R);
    flow.step(ROW);
}

/// What the reader has to know to trust the figures above them.
fn notes_lines(data: &ReportData) -> Vec<String> {
    let mut lines: Vec<String> = Vec::new();

    if data.unclassified > 0 {
        lines.push(format!(
            "{} baris belum diklasifikasi. Angka di halaman ini belum lengkap.",
            data.unclassified
        ));
    }
    if data.stale > 0 {
        lines.push(format!(
            "{} baris rekamannya berubah setelah diklasifikasi. Periksa ulang bagian Klasifikasi.",
            data.stale
        ));
    }
    if !data.excluded.is_empty() {
        // The count, because the section above lists the lines themselves; the
        // sentence points at it rather than repeating it.
        lines.push(format!(
            "{} baris sengaja tidak dimasukkan ke laporan ini.",
            data.excluded.len()
        ));
    }

    lines
}

fn notes_height(lines: &[String]) -> f64 {
    BLOCK_GAP + ROW * lines.len() as f64
}

fn notes(flow: &mut Flow<'_>, lines: &[String]) {
    flow.step(BLOCK_GAP);
    for line in lines {
        flow.left(line, S_NOTE, false);
        flow.step(ROW);
    }
}

/// `Halaman 2 dari 3`, plus when it was printed, on every page.
fn footers(pages: &mut [Page], data: &ReportData, measure: Measure<'_>) {
    let total = pages.len();
    let stamp = printed_at(data.printed_at);
    for (index, page) in pages.iter_mut().enumerate() {
        let label = format!("Halaman {} dari {}", index + 1, total);
        page.art.push(Art {
            text: label.clone(),
            x: RIGHT - measure(&label, S_NOTE, false),
            y: BOTTOM / 2.0,
            size: S_NOTE,
            bold: false,
        });
        page.art.push(Art {
            text: format!("Dicetak {stamp}"),
            x: LEFT,
            y: BOTTOM / 2.0,
            size: S_NOTE,
            bold: false,
        });
    }
}

/// Lay a report out, page by page.
pub fn lay_out(data: &ReportData, measure: Measure<'_>) -> Vec<Page> {
    let mut flow = Flow::new(measure);

    // The end matter — the totals block and the notes that qualify them — is
    // measured as one lump and moved whole. A page that ends with `Total Masuk`
    // separated from `Pembulatan`, or with the totals but without the sentence
    // saying the range has unclassified lines, is a page that misleads.
    let note_lines = notes_lines(data);
    let end_matter = totals_height(data) + notes_height(&note_lines);

    heading(&mut flow, data);
    detail(&mut flow, data);
    per_day(&mut flow, data);
    excluded(&mut flow, data);
    if !flow.fits(end_matter) {
        flow.page_break();
    }
    totals(&mut flow, data);
    notes(&mut flow, &note_lines);

    let mut pages = flow.finish();
    footers(&mut pages, data, measure);
    pages
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::report::{DiscountRow, ReportData};

    /// A predictable ruler: half an em per character. Enough to right-align and to
    /// prove a column does not overflow, without dragging a font in.
    fn ruler(text: &str, size: f64, _bold: bool) -> f64 {
        text.chars().count() as f64 * size * 0.5
    }

    fn base() -> ReportData {
        ReportData {
            period: "Harian".to_string(),
            range: "14 Maret 2026".to_string(),
            shop: "Toko Contoh".to_string(),
            address: "Jl. Contoh 1".to_string(),
            printed_at: 1_770_000_000_000,
            fix: 0,
            rows: Vec::new(),
            incoming: 0.0,
            outcoming: 0.0,
            rounding: 0.0,
            lines: 0,
            unclassified: 0,
            stale: 0,
            excluded: Vec::new(),
            discounts: Vec::new(),
            days: Vec::new(),
        }
    }

    fn row(n: usize) -> CategoryRow {
        CategoryRow {
            category: format!("Kategori {n}"),
            direction: if n.is_multiple_of(2) {
                "Masuk"
            } else {
                "Keluar"
            }
            .to_string(),
            lines: n as u32,
            total: 1_000.0 * n as f64,
        }
    }

    fn with_rows(n: usize) -> ReportData {
        let mut data = base();
        data.rows = (1..=n).map(row).collect();
        data
    }

    #[test]
    fn an_empty_report_is_one_page_and_still_draws_its_heading() {
        let pages = lay_out(&base(), &ruler);

        assert_eq!(pages.len(), 1);
        let text: Vec<&str> = pages[0].art.iter().map(|a| a.text.as_str()).collect();
        assert!(text.contains(&"Toko Contoh"));
        assert!(text.contains(&"LAPORAN KEUANGAN"));
        assert!(text.contains(&"Halaman 1 dari 1"));
    }

    #[test]
    fn every_mark_stays_inside_the_printable_box() {
        // The one layout bug that is invisible until paper: a row drawn below the
        // bottom margin, or one pushed off the right edge.
        for count in [0, 1, 12, 40, 200] {
            let pages = lay_out(&with_rows(count), &ruler);
            for page in &pages {
                for art in &page.art {
                    assert!(art.y >= 0.0, "{:?} is below the page", art.text);
                    assert!(art.y <= PAGE_H, "{:?} is above the page", art.text);
                    assert!(
                        art.x >= LEFT - 0.01,
                        "{:?} starts left of the margin",
                        art.text
                    );
                    let end = art.x + ruler(&art.text, art.size, art.bold);
                    assert!(
                        end <= RIGHT + 0.01,
                        "{:?} ends at {end}, past the right margin {RIGHT}",
                        art.text
                    );
                }
                for rule in &page.rules {
                    assert!(rule.y >= BOTTOM && rule.y <= TOP, "rule at {}", rule.y);
                }
            }
        }
    }

    #[test]
    fn a_long_table_spills_onto_more_pages() {
        let one = lay_out(&with_rows(1), &ruler);
        let many = lay_out(&with_rows(120), &ruler);

        assert_eq!(one.len(), 1);
        assert!(many.len() > 1, "120 rows do not fit on one A4");
    }

    #[test]
    fn each_page_of_a_spill_repeats_the_column_labels() {
        let pages = lay_out(&with_rows(120), &ruler);
        assert!(pages.len() > 1);

        for page in &pages {
            let text: Vec<&str> = page.art.iter().map(|a| a.text.as_str()).collect();
            assert!(
                text.contains(&"Kategori"),
                "a continuation sheet has no header"
            );
            assert!(text.contains(&"Total"));
        }
    }

    #[test]
    fn the_totals_block_is_never_split_across_pages() {
        // Walk the row count up so the table ends near the bottom margin at some
        // point; the block has to move whole rather than straddle the break.
        for count in 0..80 {
            let pages = lay_out(&with_rows(count), &ruler);
            let last = pages.last().expect("at least one page");
            let text: Vec<&str> = last.art.iter().map(|a| a.text.as_str()).collect();

            assert!(
                text.contains(&"Total Masuk"),
                "{count} rows: the totals block is not on the last page"
            );
            assert!(text.contains(&"Total Keluar"));
            assert!(text.contains(&"Pembulatan"));
            assert!(text.contains(&"Jumlah baris"));
        }
    }

    #[test]
    fn the_zero_row_table_says_so_instead_of_printing_nothing() {
        let pages = lay_out(&base(), &ruler);
        let text: Vec<&str> = pages[0].art.iter().map(|a| a.text.as_str()).collect();

        assert!(text
            .iter()
            .any(|line| line.contains("Belum ada baris yang diklasifikasi")));
    }

    #[test]
    fn a_provisional_report_says_what_is_missing() {
        let mut data = with_rows(2);
        data.unclassified = 3;
        data.stale = 4;

        let pages = lay_out(&data, &ruler);
        let text: Vec<&str> = pages
            .iter()
            .flat_map(|page| page.art.iter())
            .map(|a| a.text.as_str())
            .collect();

        assert!(text
            .iter()
            .any(|line| line.contains("3 baris belum diklasifikasi")));
        assert!(text
            .iter()
            .any(|line| line.contains("4 baris rekamannya berubah")));
    }

    #[test]
    fn the_excluded_section_lists_what_the_report_leaves_out() {
        // A total that quietly skips lines is a total nobody can audit, so the
        // lines are named — by name, direction and amount — and a sentence points
        // at the section.
        let mut data = with_rows(2);
        data.excluded = vec![
            ExcludedRow {
                name: "Ongkir".to_string(),
                direction: "Masuk".to_string(),
                total: 10_000.0,
            },
            ExcludedRow {
                name: "Ongkir".to_string(),
                direction: "Keluar".to_string(),
                total: 12_000.0,
            },
        ];

        let pages = lay_out(&data, &ruler);
        let text: Vec<String> = pages
            .iter()
            .flat_map(|page| page.art.iter().map(|art| art.text.clone()))
            .collect();

        assert!(text.iter().any(|line| line == "Dikecualikan dari laporan"));
        assert!(text
            .iter()
            .any(|line| line == "2 baris sengaja tidak dimasukkan ke laporan ini."));
        // Both directions are named, not merged into one figure.
        assert!(text.iter().any(|line| line == "Masuk"));
        assert!(text.iter().any(|line| line == "Keluar"));
        assert!(text.iter().any(|line| line == "10.000"));
        assert!(text.iter().any(|line| line == "12.000"));
    }

    #[test]
    fn the_discount_memo_sits_under_the_totals_and_says_it_is_already_deducted() {
        // A figure printed under a total is read as part of it, so the label has to
        // say otherwise — and it must never be added to anything.
        let mut data = with_rows(2);
        data.discounts = vec![
            DiscountRow {
                direction: "Masuk".to_string(),
                entries: 9_196,
                total: 279_650_342.0,
            },
            DiscountRow {
                direction: "Keluar".to_string(),
                entries: 12,
                total: 1_500.0,
            },
        ];

        let pages = lay_out(&data, &ruler);
        let last = pages.last().expect("one page");
        let text: Vec<&str> = last.art.iter().map(|art| art.text.as_str()).collect();

        assert!(text
            .iter()
            .any(|line| line.contains("Diskon baris (sudah dikurangkan)")));
        assert!(text.contains(&"279.650.342"));
        assert!(text.contains(&"1.500"));
        // One memo row per direction, both on the last page with the totals.
        assert_eq!(
            text.iter()
                .filter(|line| line.contains("Diskon baris"))
                .count(),
            2
        );
    }

    #[test]
    fn a_report_that_excludes_nothing_says_nothing_about_it() {
        let pages = lay_out(&base(), &ruler);
        let text: Vec<&str> = pages[0].art.iter().map(|a| a.text.as_str()).collect();

        assert!(!text.iter().any(|line| line.contains("Dikecualikan")));
        assert!(!text
            .iter()
            .any(|line| line.contains("sengaja tidak dimasukkan")));
    }

    #[test]
    fn a_report_that_excludes_everything_still_says_so_on_one_page() {
        // The shape a fully-excluded day makes: no category rows, an excluded
        // table, and a totals block of zeroes. It must not overflow or panic.
        let mut data = base();
        data.excluded = (1..=40)
            .map(|n| ExcludedRow {
                name: format!("Baris {n}"),
                direction: "Masuk".to_string(),
                total: 1_000.0 * n as f64,
            })
            .collect();

        let pages = lay_out(&data, &ruler);

        assert!(pages.len() > 1, "40 excluded lines do not fit on one page");
        for page in &pages {
            for art in &page.art {
                assert!(art.y >= 0.0 && art.y <= PAGE_H);
            }
        }
    }

    #[test]
    fn per_day_is_drawn_only_when_there_are_days() {
        let mut data = with_rows(1);
        data.days = vec![DayRow {
            label: "14 Mar".to_string(),
            records: 150,
            unclassified: 2,
            stale: 0,
        }];

        let with_days: Vec<String> = lay_out(&data, &ruler)
            .iter()
            .flat_map(|page| page.art.iter().map(|a| a.text.clone()))
            .collect();
        let without_days: Vec<String> = lay_out(&with_rows(1), &ruler)
            .iter()
            .flat_map(|page| page.art.iter().map(|a| a.text.clone()))
            .collect();

        assert!(with_days.iter().any(|text| text == "Per hari"));
        assert!(!without_days.iter().any(|text| text == "Per hari"));
    }

    #[test]
    fn the_footer_counts_the_pages_it_is_on() {
        let pages = lay_out(&with_rows(120), &ruler);
        let total = pages.len();

        for (index, page) in pages.iter().enumerate() {
            let expected = format!("Halaman {} dari {}", index + 1, total);
            assert!(
                page.art.iter().any(|art| art.text == expected),
                "page {} does not say {expected}",
                index + 1
            );
        }
    }

    #[test]
    fn money_prints_with_indonesian_separators() {
        assert_eq!(money(1_234_567.0, 0), "1.234.567");
        assert_eq!(money(0.0, 0), "0");
        assert_eq!(money(-5_000.0, 0), "-5.000");
    }
}
