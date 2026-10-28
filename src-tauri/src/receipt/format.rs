//! The two formatting rules the receipt cannot get from the frontend any more:
//! rupiah in the Indonesian locale, and the shop's wall-clock date.
//!
//! Both mirror exactly what the TypeScript did, because the paper is compared
//! against the screen: `.` groups thousands, `,` separates the fraction, and the
//! date is `dd-MM-yyyy`, `H:mm` (hour *not* zero-padded — `9:05`, not `09:05`).

use chrono::{DateTime, Datelike, Local, TimeZone, Timelike, Utc};

use super::Record;

/// `Number(value.toFixed(fix)).toLocaleString("id-ID")` — what every money cell
/// on a line of goods is rendered with.
///
/// The round-trip through `toFixed` is load-bearing: it is what caps the cell at
/// the record's own decimal setting, and dropping it would print `100.500,4567`
/// where the shop asked for two decimals.
///
/// One deliberate divergence: an *exact* negative half (`-2.5` at `fix: 0`)
/// rounds away from zero here, where JS `toFixed` picks the larger number (`-2`).
/// No receipt cell reaches that: line prices and totals are positive, and a
/// discount's `eff` is stored with its sign applied at print time.
pub fn format_money(value: f64, fix: f64) -> String {
    let digits = if fix.is_finite() && fix > 0.0 {
        (fix.floor() as i32).min(20)
    } else {
        0
    };
    let factor = 10f64.powi(digits);
    let rounded = (value * factor).round() / factor;
    format_number(rounded)
}

/// `value.toLocaleString("id-ID")`: `.` groups thousands, `,` separates the
/// fraction, and at most three fraction digits survive (trailing zeros dropped,
/// which is why `100500.0` prints as `100.500` and not `100.500,00`).
pub fn format_number(value: f64) -> String {
    if value.is_nan() {
        return "NaN".to_string();
    }
    if value.is_infinite() {
        return if value > 0.0 { "∞" } else { "-∞" }.to_string();
    }

    let negative = value < 0.0;
    let mut rendered = format!("{:.3}", value.abs());
    // `{:.3}` always emits the point, so trimming here cannot eat a real digit.
    while rendered.ends_with('0') {
        rendered.pop();
    }
    if rendered.ends_with('.') {
        rendered.pop();
    }

    let (integer, fraction) = match rendered.split_once('.') {
        Some((integer, fraction)) => (integer.to_string(), Some(fraction.to_string())),
        None => (rendered, None),
    };

    let mut out = String::new();
    if negative {
        out.push('-');
    }
    push_grouped(&mut out, &integer);
    if let Some(fraction) = fraction {
        out.push(',');
        out.push_str(&fraction);
    }
    out
}

/// A plain JS number as a template literal would print it: `${value}`. Used for
/// quantities and discount percentages, where `3.0` has to read `3`.
pub fn format_js_number(value: f64) -> String {
    if !value.is_finite() {
        return if value.is_nan() {
            "NaN"
        } else if value > 0.0 {
            "Infinity"
        } else {
            "-Infinity"
        }
        .to_string();
    }
    if value == value.trunc() && value.abs() < 1e15 {
        return format!("{}", value as i64);
    }
    format!("{}", value)
}

fn push_grouped(out: &mut String, digits: &str) {
    let bytes = digits.as_bytes();
    for (index, byte) in bytes.iter().enumerate() {
        if index > 0 && (bytes.len() - index).is_multiple_of(3) {
            out.push('.');
        }
        out.push(*byte as char);
    }
}

/// `capitalize` from the app's own utils: first letter of every word, the rest
/// left alone (a cashier's name is not a sentence).
pub fn capitalize(name: &str) -> String {
    name.split_whitespace()
        .map(|term| {
            let mut chars = term.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .filter(|term| !term.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

/// `dd-MM-yyyy`.
pub fn short_date<Tz: TimeZone>(date: &DateTime<Tz>) -> String {
    format!("{:02}-{:02}-{}", date.day(), date.month(), date.year())
}

/// `H:mm` — the hour is deliberately not padded.
pub fn short_time<Tz: TimeZone>(date: &DateTime<Tz>) -> String {
    format!("{}:{:02}", date.hour(), date.minute())
}

/// An epoch as the machine's wall clock, split into the two cells the header
/// prints. Empty strings when the epoch is out of range: a receipt with no date
/// is better than a print job that fails at the last step.
pub fn local_parts(epoch_ms: i64) -> (String, String) {
    match DateTime::<Utc>::from_timestamp_millis(epoch_ms) {
        Some(utc) => {
            let local = utc.with_timezone(&Local);
            (short_date(&local), short_time(&local))
        }
        None => (String::new(), String::new()),
    }
}

/// The moment the header dates the receipt with, and whether it has to say
/// "Kredit" first. A credit (utang) record has no `paidAt` yet, so it prints the
/// credit date — dating it as if it had been settled is the one thing the
/// customer would notice.
pub fn printed_at(record: &Record) -> (bool, String, String) {
    let at = record
        .paid_at
        .or(record.credit_at)
        .unwrap_or(record.created_at);
    let (date, time) = local_parts(at);
    (record.paid_at.is_none(), date, time)
}

#[cfg(test)]
mod tests {
    use super::*;

    const RECORD_CREATED_AT: i64 = 0;

    fn base() -> Record {
        Record {
            id: String::new(),
            created_at: RECORD_CREATED_AT,
            paid_at: None,
            credit_at: None,
            cashier: String::new(),
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

    fn record(paid_at: Option<i64>, credit_at: Option<i64>) -> Record {
        Record {
            paid_at,
            credit_at,
            ..base()
        }
    }

    #[test]
    fn rupiah_groups_thousands_with_a_dot() {
        assert_eq!(format_number(100_000.0), "100.000");
        assert_eq!(format_number(12_000_010.0), "12.000.010");
        assert_eq!(format_number(500.0), "500");
        assert_eq!(format_number(0.0), "0");
    }

    #[test]
    fn the_fraction_is_a_comma_and_trailing_zeros_are_dropped() {
        assert_eq!(format_number(100_500.46), "100.500,46");
        assert_eq!(format_number(0.5), "0,5");
        assert_eq!(format_number(100_500.0), "100.500");
        // Intl's default is at most three fraction digits.
        assert_eq!(format_number(100500.4567), "100.500,457");
    }

    #[test]
    fn a_negative_amount_keeps_its_sign() {
        assert_eq!(format_number(-5_000.0), "-5.000");
        assert_eq!(format_money(-500.0, 0.0), "-500");
    }

    #[test]
    fn the_records_fix_sets_the_decimals() {
        assert_eq!(format_money(100_500.456, 2.0), "100.500,46");
        // `fix: 0` drops the cents entirely rather than printing `,00`.
        assert_eq!(format_money(100_500.456, 0.0), "100.500");
        assert_eq!(format_money(100_500.5, 1.0), "100.500,5");
    }

    #[test]
    fn quantities_print_without_a_trailing_decimal() {
        assert_eq!(format_js_number(3.0), "3");
        assert_eq!(format_js_number(1.5), "1.5");
        assert_eq!(format_js_number(0.0), "0");
        assert_eq!(format_js_number(2.0), "2");
        assert_eq!(format_js_number(-2.0), "-2");
        assert_eq!(format_js_number(-1.25), "-1.25");
    }

    #[test]
    fn capitalize_keeps_the_rest_of_the_word() {
        assert_eq!(capitalize("siti"), "Siti");
        assert_eq!(capitalize("budi santoso"), "Budi Santoso");
        assert_eq!(capitalize("  andi   "), "Andi");
        assert_eq!(capitalize(""), "");
    }

    #[test]
    fn a_paid_record_is_dated_and_not_flagged_as_credit() {
        let (is_credit, _, _) = printed_at(&record(Some(1_700_000_000_000), None));
        assert!(!is_credit);
    }

    #[test]
    fn a_credit_record_is_flagged() {
        let (is_credit, _, _) = printed_at(&record(None, Some(1_701_000_000_000)));
        assert!(is_credit);
    }

    #[test]
    fn the_credit_date_wins_over_the_creation_date() {
        // The expectation is computed through the same local-time helper on
        // purpose: what is under test is which date the header reaches for, not
        // the machine's zone.
        let (_, date, _) = printed_at(&record(None, Some(1_701_000_000_000)));
        let (expected, _) = local_parts(1_701_000_000_000);
        let (created, _) = local_parts(RECORD_CREATED_AT);
        assert_eq!(date, expected);
        assert_ne!(date, created);
    }

    #[test]
    fn with_both_dates_missing_the_creation_date_is_used() {
        let (_, date, _) = printed_at(&record(None, None));
        let (expected, _) = local_parts(RECORD_CREATED_AT);
        assert_eq!(date, expected);
    }

    #[test]
    fn the_date_and_time_are_the_ones_the_cashier_reads() {
        // 2023-01-01T09:05:00Z, pinned to UTC so the assertion is the same on
        // every machine.
        let utc = DateTime::<Utc>::from_timestamp_millis(1_672_563_900_000).unwrap();
        assert_eq!(short_date(&utc), "01-01-2023");
        // The hour is not padded, the minute is.
        assert_eq!(short_time(&utc), "9:05");
    }

    #[test]
    fn half_a_rupiah_rounds_up() {
        assert_eq!(format_money(100.5, 0.0), "101");
        assert_eq!(format_money(100.4, 0.0), "100");
        assert_eq!(format_money(100.5, 2.0), "100,5");
    }

    #[test]
    fn a_fraction_that_starts_with_zero_keeps_it() {
        // Trimming trailing zeros must not turn `1,05` into `1,5`.
        assert_eq!(format_number(1.05), "1,05");
        assert_eq!(format_number(1.234), "1,234");
        assert_eq!(format_number(1.2), "1,2");
    }

    #[test]
    fn a_fix_wider_than_the_locale_prints_still_drops_the_trailing_zeros() {
        // `toFixed(3)` would leave `,500`; Intl prints at most three fraction
        // digits and no trailing zeros, so the roll gets `1,5`.
        assert_eq!(format_money(1.5, 3.0), "1,5");
    }
}
