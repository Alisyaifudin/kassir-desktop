//! Receipt layout and PDF generation.
//!
//! The whole pipeline lives on this side of the IPC boundary: a record becomes a
//! list of `TextData` rows ([`text`]), the rows are wrapped against the roll's
//! real font metrics and drawn ([`render`]). It used to be TypeScript on top of
//! `pdf-lib`, which re-embedded and subset two TrueType faces on every single
//! print — the webview also had to ship that ~2 MB library for one button.
//!
//! Everything below the command is pure: no Tauri types, no webview, so the
//! layout rules are covered by ordinary `cargo test` (see the modules' tests).

mod format;
mod render;
mod text;

pub use render::render_pdf;

use serde::Deserialize;

/// Widest the summary column (`Total`, `Pembayaran`, the rupiah cells) may get,
/// in pt. A 58 mm roll is ~164 pt, so this keeps the label and its value from
/// drifting to opposite edges on an 80 mm roll.
pub const MAXIMAL_SUMMARY_SPACE: f64 = 130.0;

/// Everything a receipt draws on. Only the fields the paper prints are declared:
/// serde ignores the rest, so the frontend's domain types can carry on growing.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptData {
    pub record: Record,
    pub products: Vec<RecordListing>,
    pub extras: Vec<RecordExtra>,
    pub info: Info,
    pub socials: Vec<Social>,
}

/// The record half of a receipt. `subTotal`, `total`, `grandTotal` and `change`
/// are already derived by the record service; this only formats them.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Record {
    pub id: String,
    pub created_at: i64,
    /// Null while an outstanding credit has not been settled.
    #[serde(default)]
    pub paid_at: Option<i64>,
    /// When the credit was opened; null for a cash record.
    #[serde(default)]
    pub credit_at: Option<i64>,
    pub cashier: String,
    /// Decimal places the line money cells are rendered with.
    pub fix: f64,
    pub sub_total: f64,
    pub total: f64,
    pub grand_total: f64,
    pub change: f64,
    pub pay: f64,
    pub rounding: f64,
    pub methods: Vec<RecordMethod>,
}

/// One line of goods, regrouped from its portions.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordListing {
    pub name: String,
    pub price: f64,
    pub qty: f64,
    pub total: f64,
    pub discounts: Vec<Discount>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Discount {
    pub kind: DiscountKind,
    pub value: f64,
    pub eff: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DiscountKind {
    Number,
    Percent,
    Pcs,
}

/// A charge or deduction applied to the whole record (a discount, a tax, a
/// delivery fee). `eff` is what it actually moved, and carries the sign.
#[derive(Debug, Clone, Deserialize)]
pub struct RecordExtra {
    pub name: String,
    pub value: f64,
    pub eff: f64,
    pub kind: ValueKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValueKind {
    Number,
    Percent,
}

/// One payment applied to a record; a record may have several (split payment).
#[derive(Debug, Clone, Deserialize)]
pub struct RecordMethod {
    pub kind: MethodKind,
    #[serde(default)]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MethodKind {
    Cash,
    Qris,
    Transfer,
    Debit,
}

impl MethodKind {
    /// The name the customer's copy prints. `cash` is spelled out because a
    /// receipt saying "cash" next to a rupiah amount reads like a bug.
    pub fn label(self) -> &'static str {
        match self {
            MethodKind::Cash => "Tunai",
            MethodKind::Qris => "QRIS",
            MethodKind::Transfer => "Transfer",
            MethodKind::Debit => "Debit",
        }
    }
}

/// The shop's identity, as edited in Settings.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    /// The shop's name as printed at the top of a receipt.
    pub owner: String,
    pub header: String,
    pub address: String,
    pub footer: String,
    pub show_cashier: bool,
}

/// A contact line printed at the foot of a receipt.
#[derive(Debug, Clone, Deserialize)]
pub struct Social {
    pub name: String,
    pub value: String,
}

/// How the roll is laid out. `paperWidth` is in mm; `padding` and both font
/// sizes are in pt.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptOption {
    pub paper_width: f64,
    pub padding: f64,
    pub size: SizeOption,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct SizeOption {
    pub normal: f64,
    pub big: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The exact shape `printReceipt` puts on the wire, camelCase and all — the
    /// frontend's domain types carry more fields than the paper prints, and this
    /// payload includes them so the "unknown fields are ignored" half is covered
    /// too. A renamed field here would otherwise only fail in the packaged app,
    /// at the moment the cashier presses Cetak.
    const PAYLOAD: &str = r#"{
        "record": {
            "id": "01-record",
            "createdAt": 1700000000000,
            "date": 1700000000000,
            "paidAt": 1700000000000,
            "creditAt": null,
            "rounding": 0,
            "isCredit": false,
            "cashier": "siti",
            "mode": "incoming",
            "pay": 100500.5,
            "note": "",
            "fix": 2,
            "customer": { "name": "", "phone": "" },
            "supplier": { "id": null, "name": "" },
            "subTotal": 100500.5,
            "total": 100500.5,
            "grandTotal": 100500.5,
            "change": 0,
            "methods": [
                { "id": "m1", "methodId": "1000", "pay": 100500.5, "name": null, "kind": "cash" }
            ],
            "updatedAt": 0,
            "syncAt": null,
            "deletedAt": null,
            "pairId": null
        },
        "products": [{
            "id": "l1",
            "productId": "p1",
            "name": "Kopi",
            "kind": "product",
            "unit": 1,
            "price": 100500.5,
            "qty": 1,
            "capital": 80000,
            "total": 100500.5,
            "discounts": [{ "id": "d1", "kind": "percent", "value": 10, "eff": 9500 }],
            "portions": []
        }],
        "extras": [
            { "id": "e1", "name": "Diskon", "value": 5000, "eff": -5000, "kind": "number", "flag": 0 }
        ],
        "info": {
            "name": "Kassir",
            "owner": "Toko Contoh",
            "address": "Jl. Contoh 1",
            "footer": "Terima kasih",
            "header": "Struk",
            "showCashier": true
        },
        "socials": [{ "id": "s1", "name": "WA", "value": "0812", "updatedAt": 0, "syncAt": null }]
    }"#;

    #[test]
    fn the_frontend_payload_deserializes_into_the_receipt_model() {
        let data: ReceiptData = serde_json::from_str(PAYLOAD).expect("the print_receipt payload");

        assert_eq!(data.record.id, "01-record");
        assert_eq!(data.record.sub_total, 100_500.5);
        assert_eq!(data.record.grand_total, 100_500.5);
        assert_eq!(data.record.fix, 2.0);
        assert_eq!(data.record.paid_at, Some(1_700_000_000_000));
        assert_eq!(data.record.credit_at, None);
        assert_eq!(data.record.methods[0].kind, MethodKind::Cash);
        assert_eq!(data.record.methods[0].name, None);

        assert_eq!(data.products[0].discounts[0].kind, DiscountKind::Percent);
        assert_eq!(data.products[0].discounts[0].eff, 9_500.0);

        assert_eq!(data.extras[0].kind, ValueKind::Number);
        assert_eq!(data.extras[0].eff, -5_000.0);

        assert!(data.info.show_cashier);
        assert_eq!(data.socials[0].name, "WA");
    }

    /// `creditAt: null` and `creditAt` missing entirely mean the same thing to a
    /// receipt. The second one only happens if a caller spreads an object that
    /// never had the key, and failing the whole print over it would be absurd.
    #[test]
    fn a_null_and_a_missing_optional_field_both_deserialize() {
        let json = r#"{
            "record": {
                "id": "01",
                "createdAt": 0,
                "paidAt": null,
                "cashier": "",
                "fix": 0,
                "subTotal": 0,
                "total": 0,
                "grandTotal": 0,
                "change": 0,
                "pay": 0,
                "rounding": 0,
                "methods": []
            },
            "products": [],
            "extras": [],
            "info": { "owner": "", "header": "", "address": "", "footer": "", "showCashier": false },
            "socials": []
        }"#;

        let data: ReceiptData = serde_json::from_str(json).expect("optional fields should default");

        assert_eq!(data.record.paid_at, None);
        assert_eq!(data.record.credit_at, None);
        assert!(data.record.methods.is_empty());
    }

    #[test]
    fn the_roll_layout_deserializes_in_millimetres_and_points() {
        let option: ReceiptOption = serde_json::from_str(
            r#"{ "paperWidth": 58, "padding": 5, "size": { "normal": 8, "big": 10 } }"#,
        )
        .expect("the print_receipt option");

        assert_eq!(option.paper_width, 58.0);
        assert_eq!(option.padding, 5.0);
        assert_eq!(option.size.normal, 8.0);
        assert_eq!(option.size.big, 10.0);
    }
}
