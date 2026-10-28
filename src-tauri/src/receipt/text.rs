//! Record -> the rows a receipt is made of. Pure data: no fonts, no PDF.
//!
//! This is the port of `src/lib/receipt/{create-receipt-data,build-header,
//! build-footer,build-summary,build-transaction-summary,product-text-data,
//! extras-text-data}.ts`. The row vocabulary is deliberately the same, because
//! the renderer below reasons in it and the unit tests assert on it — including
//! how much horizontal room a row asks for (`x`).

use super::format::{capitalize, format_js_number, format_money, format_number, printed_at};
use super::{
    DiscountKind, Info, ReceiptData, Record, RecordExtra, RecordListing, Social, ValueKind,
    MAXIMAL_SUMMARY_SPACE,
};

/// The two font sizes the receipt knows: the shop's name, everything else.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Size {
    Normal,
    Big,
}

/// One row of paper. `x` is an optional left offset from the roll's edge, in pt.
#[derive(Debug, Clone, PartialEq)]
pub enum TextData {
    /// Centred inside the printable width; wrapped before it is drawn.
    Center { size: Size, text: String },
    /// Left-aligned; wrapped before it is drawn.
    Long { size: Size, text: String },
    /// Two cells on one line, the right one pushed towards the right edge.
    SpaceBetween {
        size: Size,
        x: Option<f64>,
        text: (String, String),
    },
    /// One cell against the right edge.
    End { size: Size, text: String },
    /// An empty line.
    LineBreak { size: Size },
    /// A dashed rule from `x` (default: the padding) to the right padding.
    Line { size: Size, x: Option<f64> },
}

impl TextData {
    pub fn size(&self) -> Size {
        match self {
            TextData::Center { size, .. }
            | TextData::Long { size, .. }
            | TextData::SpaceBetween { size, .. }
            | TextData::End { size, .. }
            | TextData::LineBreak { size }
            | TextData::Line { size, .. } => *size,
        }
    }
}

pub fn create_receipt_data(data: &ReceiptData, paper_width: f64) -> Vec<TextData> {
    let mut text_data = Vec::new();

    text_data.extend(build_header_section(&data.info, &data.record));

    text_data.push(TextData::Line {
        size: Size::Normal,
        x: None,
    });

    text_data.extend(products_text_data(&data.products, data.record.fix));

    text_data.push(TextData::Line {
        size: Size::Normal,
        x: None,
    });

    text_data.extend(build_summary_section(
        &data.record,
        &data.extras,
        paper_width,
    ));

    text_data.push(build_transaction_summary(&data.products, &data.record));

    text_data.push(TextData::LineBreak { size: Size::Normal });

    text_data.extend(build_footer_section(&data.info, &data.socials));

    text_data
}

fn build_header_section(info: &Info, record: &Record) -> Vec<TextData> {
    let mut text_data = vec![
        TextData::Center {
            size: Size::Big,
            text: info.owner.clone(),
        },
        TextData::Center {
            size: Size::Normal,
            text: info.header.clone(),
        },
        TextData::Long {
            size: Size::Normal,
            text: info.address.clone(),
        },
        TextData::Long {
            size: Size::Normal,
            text: format!("No: {}", record.id),
        },
    ];

    let (is_credit, date, time) = printed_at(record);
    let datetime = format!(
        "{}{}, {}",
        if is_credit { "Kredit " } else { "" },
        date,
        time
    );

    if info.show_cashier {
        text_data.push(TextData::SpaceBetween {
            size: Size::Normal,
            x: None,
            text: (format!("Kasir: {}", capitalize(&record.cashier)), datetime),
        });
    } else {
        text_data.push(TextData::End {
            size: Size::Normal,
            text: datetime,
        });
    }

    text_data
}

fn build_footer_section(info: &Info, socials: &[Social]) -> Vec<TextData> {
    let mut text_data = Vec::new();

    // `"".split("\n")` is `[""]`, so an empty footer is one empty centred row —
    // the paper keeps the gap the operator left.
    for footer in info.footer.split('\n') {
        text_data.push(TextData::Center {
            size: Size::Normal,
            text: footer.to_string(),
        });
    }

    for social in socials {
        text_data.push(TextData::Long {
            size: Size::Normal,
            text: format!("{}: {}", social.name, social.value),
        });
    }

    text_data
}

fn build_summary_section(
    record: &Record,
    extras: &[RecordExtra],
    paper_width: f64,
) -> Vec<TextData> {
    let space = MAXIMAL_SUMMARY_SPACE.min(paper_width);
    let column_x = paper_width - space;
    let mut text_data = Vec::new();

    // The subtotal is only its own line when an extra makes it differ from the
    // total; otherwise it would be the same number twice.
    if record.sub_total != record.total {
        text_data.push(TextData::End {
            size: Size::Normal,
            text: format!("Rp{}", format_number(record.sub_total)),
        });
    } else {
        text_data.push(TextData::SpaceBetween {
            size: Size::Normal,
            x: Some(column_x),
            text: (
                "Total".to_string(),
                format!("Rp{}", format_number(record.total)),
            ),
        });
    }

    if !extras.is_empty() {
        text_data.extend(extras_text_data(extras, paper_width));
        text_data.push(TextData::Line {
            size: Size::Normal,
            x: Some(column_x),
        });
        text_data.push(TextData::SpaceBetween {
            size: Size::Normal,
            x: Some(column_x),
            text: (
                "Total".to_string(),
                format!("Rp{}", format_number(record.total)),
            ),
        });
    }

    // A sale may be rounded *down* too, so the guard is "any rounding at all":
    // printing nothing would hide the difference between `Total` and
    // `Pembayaran` on the customer's copy.
    if record.rounding != 0.0 {
        let sign = if record.rounding < 0.0 { "-" } else { "" };
        text_data.push(TextData::SpaceBetween {
            size: Size::Normal,
            x: Some(column_x),
            text: (
                "Pembulatan".to_string(),
                format!("{sign}Rp{}", format_number(record.rounding.abs())),
            ),
        });
        text_data.push(TextData::SpaceBetween {
            size: Size::Normal,
            x: Some(column_x),
            text: (
                "Total Semua".to_string(),
                format!("Rp{}", format_number(record.grand_total)),
            ),
        });
    }

    text_data.push(TextData::Line {
        size: Size::Normal,
        x: Some(column_x),
    });

    let pay_sign = if record.pay >= 0.0 { "" } else { "-" };
    text_data.push(TextData::SpaceBetween {
        size: Size::Normal,
        x: Some(column_x),
        text: (
            "Pembayaran".to_string(),
            format!("{pay_sign}Rp{}", format_number(record.pay.abs())),
        ),
    });

    if record.change != 0.0 {
        let sign = if record.change >= 0.0 { "" } else { "-" };
        text_data.push(TextData::SpaceBetween {
            size: Size::Normal,
            x: Some(column_x),
            text: (
                "Kembalian".to_string(),
                format!("{sign}Rp{}", format_number(record.change.abs())),
            ),
        });
    }

    text_data
}

fn build_transaction_summary(products: &[RecordListing], record: &Record) -> TextData {
    let num_of_species = products.len();
    let num_of_items: f64 = products.iter().map(|product| product.qty).sum();
    let summary_num = format!(
        "{} Jenis/{} pcs",
        num_of_species,
        format_js_number(num_of_items)
    );

    // A record can carry several payments (split payment), so list them all.
    let method_name = record
        .methods
        .iter()
        .map(|method| match method.name.as_deref() {
            Some(name) if !name.is_empty() => {
                format!("{} ({})", method.kind.label(), name)
            }
            _ => method.kind.label().to_string(),
        })
        .collect::<Vec<_>>()
        .join(", ");

    TextData::SpaceBetween {
        size: Size::Normal,
        x: None,
        text: (summary_num, method_name),
    }
}

fn products_text_data(products: &[RecordListing], fix: f64) -> Vec<TextData> {
    let mut text_data = Vec::new();

    for product in products {
        text_data.push(TextData::Long {
            size: Size::Normal,
            text: product.name.clone(),
        });

        text_data.push(TextData::SpaceBetween {
            size: Size::Normal,
            x: None,
            text: (
                format!(
                    "{} x {}",
                    format_money(product.price, fix),
                    format_js_number(product.qty)
                ),
                format_money(product.total, fix),
            ),
        });

        for discount in &product.discounts {
            let discount_text = format!("(-{})", format_money(discount.eff, fix));
            let label = match discount.kind {
                // A flat-amount discount has no percentage or piece count to show,
                // so it prints as just the deduction, hard against the right edge.
                DiscountKind::Number => None,
                DiscountKind::Percent => {
                    Some(format!("(Diskon {}%)", format_js_number(discount.value)))
                }
                DiscountKind::Pcs => {
                    Some(format!("(Diskon {}pcs)", format_js_number(discount.value)))
                }
            };
            match label {
                None => text_data.push(TextData::End {
                    size: Size::Normal,
                    text: discount_text,
                }),
                Some(label) => text_data.push(TextData::SpaceBetween {
                    size: Size::Normal,
                    x: None,
                    text: (label, discount_text),
                }),
            }
        }

        text_data.push(TextData::LineBreak { size: Size::Normal });
    }

    text_data
}

fn extras_text_data(extras: &[RecordExtra], paper_width: f64) -> Vec<TextData> {
    let space = MAXIMAL_SUMMARY_SPACE.min(paper_width);
    let column_x = paper_width - space;

    extras
        .iter()
        .map(|extra| {
            // `eff == 0` prints a minus, exactly as the webview version did: a
            // zero extra is still a deduction slot, not a charge.
            let sign = if extra.eff > 0.0 { "" } else { "-" };
            let value = format!("{sign}Rp{}", format_number(extra.eff.abs()));
            let label = match extra.kind {
                ValueKind::Number => extra.name.clone(),
                ValueKind::Percent => format!("{} {}%", extra.name, format_js_number(extra.value)),
            };
            TextData::SpaceBetween {
                size: Size::Normal,
                x: Some(column_x),
                text: (label, value),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::receipt::{Discount, MethodKind, RecordMethod};

    fn info() -> Info {
        Info {
            owner: "Toko Contoh".to_string(),
            header: "Struk".to_string(),
            address: "Jl. Contoh 1".to_string(),
            footer: "Terima kasih".to_string(),
            show_cashier: false,
        }
    }

    fn social(name: &str, value: &str) -> Social {
        Social {
            name: name.to_string(),
            value: value.to_string(),
        }
    }

    fn record() -> Record {
        Record {
            id: "01-record".to_string(),
            created_at: 1_700_000_000_000,
            paid_at: Some(1_700_000_000_000),
            credit_at: None,
            cashier: "siti".to_string(),
            fix: 0.0,
            sub_total: 0.0,
            total: 0.0,
            grand_total: 0.0,
            change: 0.0,
            pay: 0.0,
            rounding: 0.0,
            methods: Vec::new(),
        }
    }

    fn line() -> RecordListing {
        RecordListing {
            name: "Kopi".to_string(),
            price: 100_500.0,
            qty: 1.0,
            total: 100_500.0,
            discounts: Vec::new(),
        }
    }

    fn extra(name: &str, eff: f64) -> RecordExtra {
        RecordExtra {
            name: name.to_string(),
            value: 10_000.0,
            eff,
            kind: ValueKind::Number,
        }
    }

    /// The `[label, value]` cells of every `spacebetween` row, in print order.
    fn pairs(rows: &[TextData]) -> Vec<(String, String)> {
        rows.iter()
            .filter_map(|row| match row {
                TextData::SpaceBetween { text, .. } => Some((text.0.clone(), text.1.clone())),
                _ => None,
            })
            .collect()
    }

    fn labels(rows: &[TextData]) -> Vec<String> {
        pairs(rows).into_iter().map(|(label, _)| label).collect()
    }

    fn value_of(rows: &[TextData], label: &str) -> Option<String> {
        pairs(rows)
            .into_iter()
            .find(|(row_label, _)| row_label == label)
            .map(|(_, value)| value)
    }

    /// Every printed line, flattened — what a text-only printer would receive.
    fn flatten(rows: &[TextData]) -> String {
        rows.iter()
            .map(|row| match row {
                TextData::Center { text, .. } | TextData::Long { text, .. } => text.clone(),
                TextData::SpaceBetween { text, .. } => format!("{} {}", text.0, text.1),
                TextData::End { text, .. } => text.clone(),
                TextData::LineBreak { .. } | TextData::Line { .. } => String::new(),
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn section_order(rows: &[TextData]) -> Vec<String> {
        pairs(rows)
            .into_iter()
            .map(|(label, value)| format!("{label}={value}"))
            .collect()
    }

    // ---------------------------------------------------------------- header

    #[test]
    fn a_paid_record_is_dated_without_saying_credit() {
        let text = flatten(&build_header_section(&info(), &record()));
        assert!(!text.contains("Kredit"));
        assert!(text.contains("No: 01-record"));
    }

    #[test]
    fn a_credit_record_prints_the_credit_date_instead_of_crashing() {
        let credit_at = 1_701_000_000_000;
        let rows = build_header_section(
            &info(),
            &Record {
                paid_at: None,
                credit_at: Some(credit_at),
                ..record()
            },
        );

        let text = flatten(&rows);
        assert!(text.contains("Kredit"));
        let (date, _) = crate::receipt::format::local_parts(credit_at);
        assert!(text.contains(&date));
    }

    #[test]
    fn the_cashier_row_is_centred_only_when_the_shop_wants_it() {
        let shown = build_header_section(
            &Info {
                show_cashier: true,
                ..info()
            },
            &record(),
        );
        assert!(labels(&shown).iter().any(|label| label == "Kasir: Siti"));

        let hidden = build_header_section(&info(), &record());
        assert!(!labels(&hidden)
            .iter()
            .any(|label| label.starts_with("Kasir")));
        assert!(hidden
            .iter()
            .any(|row| matches!(row, TextData::End { text, .. } if !text.is_empty())));
    }

    // ---------------------------------------------------------------- footer

    #[test]
    fn each_footer_line_is_its_own_centred_row_in_order() {
        let rows = build_footer_section(
            &Info {
                footer: "Terima kasih\nBarang yang dibeli tidak dapat ditukar".to_string(),
                ..info()
            },
            &[],
        );

        assert_eq!(
            rows,
            vec![
                TextData::Center {
                    size: Size::Normal,
                    text: "Terima kasih".to_string()
                },
                TextData::Center {
                    size: Size::Normal,
                    text: "Barang yang dibeli tidak dapat ditukar".to_string()
                },
            ]
        );
    }

    #[test]
    fn contacts_print_after_the_footer_one_long_row_each() {
        let rows = build_footer_section(&info(), &[social("WA", "0812"), social("IG", "@warung")]);

        assert_eq!(
            rows[1..].to_vec(),
            vec![
                TextData::Long {
                    size: Size::Normal,
                    text: "WA: 0812".to_string()
                },
                TextData::Long {
                    size: Size::Normal,
                    text: "IG: @warung".to_string()
                },
            ]
        );
    }

    #[test]
    fn an_empty_footer_is_one_empty_centred_row() {
        let rows = build_footer_section(
            &Info {
                footer: String::new(),
                ..info()
            },
            &[],
        );
        assert_eq!(
            rows,
            vec![TextData::Center {
                size: Size::Normal,
                text: String::new()
            }]
        );
    }

    // --------------------------------------------------------------- summary

    #[test]
    fn with_no_rounding_there_is_one_total_and_no_pembulatan_row() {
        let rows = build_summary_section(
            &Record {
                sub_total: 100_000.0,
                total: 100_000.0,
                grand_total: 100_000.0,
                pay: 100_000.0,
                ..record()
            },
            &[],
            32.0,
        );

        assert_eq!(labels(&rows), ["Total", "Pembayaran"]);
        assert_eq!(value_of(&rows, "Total").as_deref(), Some("Rp100.000"));
    }

    #[test]
    fn rounding_up_puts_pembulatan_and_total_semua_before_pembayaran() {
        let rows = build_summary_section(
            &Record {
                sub_total: 100_500.0,
                total: 100_500.0,
                rounding: 500.0,
                grand_total: 101_000.0,
                pay: 101_000.0,
                ..record()
            },
            &[],
            32.0,
        );

        assert_eq!(
            labels(&rows),
            ["Total", "Pembulatan", "Total Semua", "Pembayaran"]
        );
        assert_eq!(value_of(&rows, "Pembulatan").as_deref(), Some("Rp500"));
        assert_eq!(value_of(&rows, "Total Semua").as_deref(), Some("Rp101.000"));
    }

    #[test]
    fn rounding_down_prints_a_negative_pembulatan_and_the_grand_total() {
        // A Rp100.500 sale rounded down to Rp100.000 used to print only
        // `Total Rp100.500` / `Pembayaran Rp100.000`, i.e. paper that does not
        // explain the Rp500 and no line showing what was actually owed.
        let rows = build_summary_section(
            &Record {
                sub_total: 100_500.0,
                total: 100_500.0,
                rounding: -500.0,
                grand_total: 100_000.0,
                pay: 100_000.0,
                ..record()
            },
            &[],
            32.0,
        );

        assert_eq!(
            labels(&rows),
            ["Total", "Pembulatan", "Total Semua", "Pembayaran"]
        );
        assert_eq!(value_of(&rows, "Pembulatan").as_deref(), Some("-Rp500"));
        assert_eq!(value_of(&rows, "Total Semua").as_deref(), Some("Rp100.000"));
    }

    #[test]
    fn extras_print_the_subtotal_the_discount_and_the_total_after_them() {
        let discount = RecordExtra {
            name: "Diskon".to_string(),
            value: 5_000.0,
            eff: -5_000.0,
            kind: ValueKind::Number,
        };

        let rows = build_summary_section(
            &Record {
                sub_total: 100_000.0,
                total: 95_000.0,
                rounding: -500.0,
                grand_total: 94_500.0,
                pay: 100_000.0,
                change: 5_500.0,
                ..record()
            },
            &[discount],
            32.0,
        );

        assert_eq!(
            labels(&rows),
            [
                "Diskon",
                "Total",
                "Pembulatan",
                "Total Semua",
                "Pembayaran",
                "Kembalian"
            ]
        );
        assert_eq!(value_of(&rows, "Diskon").as_deref(), Some("-Rp5.000"));
        assert_eq!(value_of(&rows, "Total").as_deref(), Some("Rp95.000"));
        assert_eq!(value_of(&rows, "Pembulatan").as_deref(), Some("-Rp500"));
        assert_eq!(value_of(&rows, "Total Semua").as_deref(), Some("Rp94.500"));
        assert_eq!(value_of(&rows, "Kembalian").as_deref(), Some("Rp5.500"));
    }

    // ---------------------------------------------------------- transaction

    #[test]
    fn the_transaction_summary_counts_the_species_and_the_pieces() {
        let row = build_transaction_summary(
            &[
                RecordListing { qty: 1.0, ..line() },
                RecordListing { qty: 3.0, ..line() },
            ],
            &record(),
        );

        assert_eq!(
            row,
            TextData::SpaceBetween {
                size: Size::Normal,
                x: None,
                text: ("2 Jenis/4 pcs".to_string(), String::new()),
            }
        );
    }

    #[test]
    fn an_extras_only_record_has_no_goods_to_count() {
        let row = build_transaction_summary(&[], &record());
        assert_eq!(pairs(&[row])[0].0, "0 Jenis/0 pcs");
    }

    #[test]
    fn every_payment_of_a_split_is_named() {
        let row = build_transaction_summary(
            &[line()],
            &Record {
                methods: vec![
                    RecordMethod {
                        kind: MethodKind::Cash,
                        name: None,
                    },
                    RecordMethod {
                        kind: MethodKind::Debit,
                        name: Some("BCA".to_string()),
                    },
                ],
                ..record()
            },
        );

        // The base kind has no name, so only the variant is parenthesised.
        assert_eq!(pairs(&[row])[0].1, "Tunai, Debit (BCA)");
    }

    #[test]
    fn a_single_payment_prints_just_its_kind() {
        let row = build_transaction_summary(
            &[line()],
            &Record {
                methods: vec![RecordMethod {
                    kind: MethodKind::Qris,
                    name: None,
                }],
                ..record()
            },
        );
        assert_eq!(pairs(&[row])[0].1, "QRIS");
    }

    // -------------------------------------------------------------- products

    #[test]
    fn a_plain_line_prints_its_name_its_unit_price_and_its_total() {
        assert_eq!(
            products_text_data(&[line()], 0.0),
            vec![
                TextData::Long {
                    size: Size::Normal,
                    text: "Kopi".to_string()
                },
                TextData::SpaceBetween {
                    size: Size::Normal,
                    x: None,
                    text: ("100.500 x 1".to_string(), "100.500".to_string())
                },
                TextData::LineBreak { size: Size::Normal },
            ]
        );
    }

    #[test]
    fn the_records_fix_sets_the_decimals_on_every_money_cell() {
        let rows = products_text_data(
            &[RecordListing {
                price: 100_500.456,
                total: 100_500.456,
                ..line()
            }],
            2.0,
        );

        assert_eq!(
            pairs(&rows),
            [("100.500,46 x 1".to_string(), "100.500,46".to_string())]
        );
        assert_eq!(
            pairs(&products_text_data(&[line()], 0.0)),
            [("100.500 x 1".to_string(), "100.500".to_string())]
        );
    }

    #[test]
    fn each_discount_prints_the_label_its_kind_calls_for() {
        let rows = products_text_data(
            &[RecordListing {
                discounts: vec![
                    Discount {
                        kind: DiscountKind::Number,
                        value: 5_000.0,
                        eff: 5_000.0,
                    },
                    Discount {
                        kind: DiscountKind::Percent,
                        value: 10.0,
                        eff: 9_500.0,
                    },
                    Discount {
                        kind: DiscountKind::Pcs,
                        value: 2.0,
                        eff: 2_000.0,
                    },
                ],
                ..line()
            }],
            0.0,
        );

        // rows = name, price×qty, three discounts, linebreak
        assert!(rows.contains(&TextData::End {
            size: Size::Normal,
            text: "(-5.000)".to_string()
        }));
        assert!(rows.contains(&TextData::SpaceBetween {
            size: Size::Normal,
            x: None,
            text: ("(Diskon 10%)".to_string(), "(-9.500)".to_string())
        }));
        assert!(rows.contains(&TextData::SpaceBetween {
            size: Size::Normal,
            x: None,
            text: ("(Diskon 2pcs)".to_string(), "(-2.000)".to_string())
        }));
    }

    #[test]
    fn a_line_with_discounts_keeps_its_trailing_blank_line() {
        let rows = products_text_data(
            &[RecordListing {
                discounts: vec![Discount {
                    kind: DiscountKind::Number,
                    value: 1_000.0,
                    eff: 1_000.0,
                }],
                ..line()
            }],
            0.0,
        );

        assert_eq!(
            rows.last(),
            Some(&TextData::LineBreak { size: Size::Normal })
        );
    }

    #[test]
    fn lines_print_in_the_order_they_were_rung_up() {
        let rows = products_text_data(
            &[
                line(),
                RecordListing {
                    name: "Teh".to_string(),
                    ..line()
                },
            ],
            0.0,
        );
        let names: Vec<&str> = rows
            .iter()
            .filter_map(|row| match row {
                TextData::Long { text, .. } => Some(text.as_str()),
                _ => None,
            })
            .collect();

        assert_eq!(names, ["Kopi", "Teh"]);
    }

    // ---------------------------------------------------------------- extras

    #[test]
    fn a_flat_charge_prints_its_name_and_rupiah_in_the_summary_column() {
        assert_eq!(
            extras_text_data(&[extra("Ongkir", 10_000.0)], 200.0),
            vec![TextData::SpaceBetween {
                size: Size::Normal,
                x: Some(200.0 - MAXIMAL_SUMMARY_SPACE),
                text: ("Ongkir".to_string(), "Rp10.000".to_string()),
            }]
        );
    }

    #[test]
    fn a_narrow_paper_clamps_the_column_to_the_paper_width() {
        let rows = extras_text_data(&[extra("Ongkir", 10_000.0)], 100.0);
        assert_eq!(
            rows,
            vec![TextData::SpaceBetween {
                size: Size::Normal,
                x: Some(0.0),
                text: ("Ongkir".to_string(), "Rp10.000".to_string()),
            }]
        );
    }

    #[test]
    fn a_percent_charge_keeps_its_percentage_in_the_label() {
        let rows = extras_text_data(
            &[RecordExtra {
                kind: ValueKind::Percent,
                value: 10.0,
                eff: 5_000.0,
                ..extra("Ongkir", 5_000.0)
            }],
            200.0,
        );
        assert_eq!(
            pairs(&rows),
            [("Ongkir 10%".to_string(), "Rp5.000".to_string())]
        );
    }

    #[test]
    fn a_deduction_prints_as_a_negative_rupiah() {
        let rows = extras_text_data(&[extra("Ongkir", -5_000.0)], 200.0);
        assert_eq!(
            pairs(&rows),
            [("Ongkir".to_string(), "-Rp5.000".to_string())]
        );
    }

    #[test]
    fn the_extras_keep_their_order_and_an_empty_list_prints_nothing() {
        let rows = extras_text_data(
            &[extra("Ongkir", 10_000.0), extra("Diskon", -1_000.0)],
            200.0,
        );
        assert_eq!(labels(&rows), ["Ongkir".to_string(), "Diskon".to_string()]);
        assert!(extras_text_data(&[], 200.0).is_empty());
    }

    // ------------------------------------------------------------ whole page

    #[test]
    fn the_money_lines_follow_the_order_the_cashier_reads() {
        let rows = create_receipt_data(
            &ReceiptData {
                info: info(),
                socials: vec![social("WA", "0812")],
                products: vec![line()],
                extras: vec![RecordExtra {
                    name: "Diskon".to_string(),
                    value: 500.0,
                    eff: -500.0,
                    kind: ValueKind::Number,
                }],
                record: Record {
                    total: 100_000.0,
                    rounding: -500.0,
                    grand_total: 99_500.0,
                    pay: 100_000.0,
                    change: 500.0,
                    methods: vec![RecordMethod {
                        kind: MethodKind::Cash,
                        name: None,
                    }],
                    ..record()
                },
            },
            32.0,
        );

        assert_eq!(
            section_order(&rows),
            [
                "100.500 x 1=100.500",
                "Diskon=-Rp500",
                "Total=Rp100.000",
                "Pembulatan=-Rp500",
                "Total Semua=Rp99.500",
                "Pembayaran=Rp100.000",
                "Kembalian=Rp500",
                "1 Jenis/1 pcs=Tunai",
            ]
        );
    }

    #[test]
    fn the_page_carries_the_footer_and_the_contacts_and_no_broken_money() {
        let rows = create_receipt_data(
            &ReceiptData {
                info: info(),
                socials: vec![social("WA", "0812")],
                products: vec![line()],
                extras: Vec::new(),
                record: record(),
            },
            32.0,
        );
        let text = flatten(&rows);

        assert!(text.contains("Terima kasih"));
        assert!(text.contains("WA: 0812"));
        assert!(!text.contains("NaN"));
        assert!(!text.contains("undefined"));
    }

    // ------------------------------------------------------- header details

    #[test]
    fn the_header_carries_the_address_and_the_order_number_as_long_rows() {
        let rows = build_header_section(&info(), &record());

        let longs: Vec<&str> = rows
            .iter()
            .filter_map(|row| match row {
                TextData::Long { text, .. } => Some(text.as_str()),
                _ => None,
            })
            .collect();

        assert_eq!(longs, ["Jl. Contoh 1", "No: 01-record"]);
        // The shop's own name is the one big row on the page.
        assert!(matches!(
            rows.first(),
            Some(TextData::Center {
                size: Size::Big,
                ..
            })
        ));
    }

    #[test]
    fn a_credit_page_dates_the_receipt_with_the_credit_date() {
        let credit_at = 1_701_000_000_000;
        let created_at = 1_700_000_000_000;

        let rows = create_receipt_data(
            &ReceiptData {
                info: info(),
                socials: Vec::new(),
                products: vec![line()],
                extras: Vec::new(),
                record: Record {
                    paid_at: None,
                    credit_at: Some(credit_at),
                    created_at,
                    ..record()
                },
            },
            32.0,
        );

        let text = flatten(&rows);
        let (credit_date, _) = crate::receipt::format::local_parts(credit_at);
        let (created_date, _) = crate::receipt::format::local_parts(created_at);

        // The two dates differ, so the assertion says which one was printed.
        assert_ne!(credit_date, created_date);
        assert!(text.contains("Kredit "));
        assert!(text.contains(&credit_date));
        assert!(!text.contains(&created_date));
    }

    // ---------------------------------------------------------- summary edges

    #[test]
    fn a_differing_subtotal_is_its_own_right_aligned_row() {
        let rows = build_summary_section(
            &Record {
                sub_total: 100_500.0,
                total: 100_000.0,
                grand_total: 100_000.0,
                pay: 100_000.0,
                ..record()
            },
            &[],
            32.0,
        );

        // With no extras there is no labelled `Total` row at all: the subtotal is
        // printed on its own, and the label only appears once extras were applied.
        assert_eq!(
            rows.first(),
            Some(&TextData::End {
                size: Size::Normal,
                text: "Rp100.500".to_string()
            })
        );
        assert_eq!(labels(&rows), ["Pembayaran"]);
    }

    #[test]
    fn a_zero_extra_still_prints_a_minus() {
        // `eff == 0` is neither a charge nor a deduction, and the old layout
        // printed it as a minus. Locked in so the port stays byte-identical to
        // the paper the shop already knows.
        let rows = extras_text_data(&[extra("Ongkir", 0.0)], 200.0);
        assert_eq!(pairs(&rows), [("Ongkir".to_string(), "-Rp0".to_string())]);
    }

    #[test]
    fn a_method_with_an_empty_name_prints_only_its_kind() {
        let row = build_transaction_summary(
            &[line()],
            &Record {
                methods: vec![RecordMethod {
                    kind: MethodKind::Transfer,
                    name: Some(String::new()),
                }],
                ..record()
            },
        );

        assert_eq!(pairs(&[row])[0].1, "Transfer");
    }
}
