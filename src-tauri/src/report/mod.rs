//! The financial report: A4 layout, then a PDF.
//!
//! The same pipeline shape as `receipt/` — a data model in, pure layout, pure
//! drawing — but with one structural difference that decides the whole design: a
//! receipt is a single page whose height is *computed* from its rows, while a
//! report is **paged**. A4 is fixed, the table repeats its header when it spills,
//! and the totals block has to land complete on the last page.
//!
//! So `layout.rs` owns every position and every page break, and `render.rs` only
//! draws what it is handed. That split is what makes the arithmetic (does a page
//! overflow? did the header get repeated? is `Halaman 2 dari 3` right?) testable
//! with `cargo test` and no PDF at all.
//!
//! The *sums* are not here: the report body is derived on the frontend from
//! `services/report`, and this module never learns which record a figure came
//! from. It is given `ReportData` and prints it.

mod layout;
mod render;

pub use layout::{lay_out, Art, Page, PAGE_H, PAGE_W};

use serde::Deserialize;

/// Everything the paper prints.
///
/// Only the fields the report draws are declared — serde ignores the rest — so the
/// frontend's domain model (`ReportTotals`, `PeriodDay`) can keep growing without
/// touching this file, exactly as `ReceiptData` does.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportData {
    /// `Harian`, `Mingguan`, `Bulanan`, `Kuartalan`, `Tahunan`.
    pub period: String,
    /// The range as the header labels it: `14 Maret 2026`, `9–15 Mar 2026`.
    pub range: String,
    pub shop: String,
    pub address: String,
    /// When the PDF was asked for, in epoch milliseconds.
    pub printed_at: i64,
    /// Decimal places the money cells are rendered with.
    pub fix: u32,
    /// One row per (category, direction), in the order the categories are kept.
    pub rows: Vec<CategoryRow>,
    pub incoming: f64,
    pub outcoming: f64,
    /// The rounding that was handed back across the range. Reported apart from the
    /// categories so the two still reconcile — see `REPORT.md` §7.
    pub rounding: f64,
    pub lines: u32,
    /// Lines with no category. A report with any is provisional, and says so.
    pub unclassified: u32,
    /// Classified lines whose record changed afterwards.
    pub stale: u32,
    /// Lines the operator left out of the report. Printed as their own section —
    /// a total that quietly skips lines is a total nobody can audit.
    pub excluded: Vec<ExcludedRow>,
    /// The discounts the category totals already net out. A memo, never an
    /// addition: printing it is the only way the paper can say how much discount
    /// the trade gave away.
    #[serde(default)]
    pub discounts: Vec<DiscountRow>,
    /// One row per day, for a period report. Empty for a single day.
    pub days: Vec<DayRow>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRow {
    pub category: String,
    /// `Masuk` or `Keluar` — the direction the money moved.
    pub direction: String,
    pub lines: u32,
    pub total: f64,
}

/// Discounts already deducted from the category totals, per direction.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscountRow {
    /// `Masuk` or `Keluar`.
    pub direction: String,
    /// How many discounts were entered — not how many lines carry one.
    pub entries: u32,
    pub total: f64,
}

/// One line the report deliberately leaves out, so the figures it does show can
/// be read against what they skip.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcludedRow {
    pub name: String,
    /// `Masuk` or `Keluar`.
    pub direction: String,
    pub total: f64,
}

/// Lay a report out and render it.
///
/// The bytes go back as a raw IPC body (`tauri::ipc::Response`), not as a JSON
/// array of numbers: a PDF is already compact, and serde's array encoding would
/// quadruple it across the boundary once per view. The frontend turns it straight
/// into a `Blob` for the viewer and, for a download, hands it back to
/// `export_bytes`.
#[tauri::command]
pub fn report_pdf(data: ReportData) -> Result<tauri::ipc::Response, String> {
    render::render_pdf(&data).map(tauri::ipc::Response::new)
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayRow {
    /// `14 Mar` — the day as the rail labels it.
    pub label: String,
    pub records: u32,
    pub unclassified: u32,
    pub stale: u32,
}
