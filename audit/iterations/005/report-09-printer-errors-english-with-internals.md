---
slug: printer-errors-english-with-internals
title: "Printer failures surface raw English developer text to the cashier"
severity: low
category: ux
iteration: 5
created: 2026-10-21T19:55:14.394Z
files:
  - "src-tauri/src/printer.rs"
  - "src/lib/printer.ts"
  - "src/pages/Setting/Printer/util-program-print.ts"
  - "src/pages/Setting/Printer/use-test.ts"
---

# Printer failures surface raw English developer text to the cashier

- **Severity:** low
- **Category:** ux
- **Files:** `src-tauri/src/printer.rs`, `src/lib/printer.ts`, `src/pages/Setting/Printer/util-program-print.ts`, `src/pages/Setting/Printer/use-test.ts`
- **Iteration:** 5

## Summary

`printer.rs` returns English, developer-flavoured strings (`"No printers found on this system. Please install a printer first."`, `"Failed to persist temp file: …"`, `"Printer 'x' not found. Available printers: [...]"`) and the frontend renders them verbatim on Setting → Printer, in an otherwise Indonesian app whose sibling Rust module (`export.rs`) already logs the cause and returns one Indonesian sentence. The Windows no-printer message is the first thing a new shop sees on that screen.

## Details

## Evidence

`printPdf` / `getPrinters` errors travel from Rust to the cashier unchanged. The
call chain passes the string straight through:

- `src-tauri/src/printer.rs` returns `Err(String)` built with English prose;
- `src/lib/printer.ts:12-25` wraps it as `InvokeError` and keeps the message;
- `src/pages/Setting/Printer/util-program-print.ts:31-40` returns `error.message`
  as the value the dialog renders;
- `src/pages/Setting/Printer/use-test.ts:19` stores it and the page prints it.

The strings a Windows operator can see today:

```
printer.rs:102  "No printers found on this system. Please install a printer first."
printer.rs:129  "Printer '{}' not found. Available printers: [{}]"
printer.rs:40   "Failed to create temp file: {}"
printer.rs:43   "Failed to write PDF: {}"
printer.rs:45   "Failed to flush: {}"
printer.rs:50   "Failed to persist temp file: {}"
```

plus `src/lib/printer.ts:15,25` fallbacks `"Failed to get printers"` /
`"Failed to print PDF"`.

This is not a Linux-only corner: `printer.rs:102` is inside the
`#[cfg(windows)]` `platform` module and is the message shown the first time a
shop opens **Setting → Printer** without a printer installed, and
`printer.rs:129` is what appears after a printer is renamed in Windows. The same
file's success path is already Indonesian (`"Dikirim ke printer '{}' ({} byte)"`,
`"Gagal membaca daftar printer: {}"`), as is `export.rs` — so this is drift inside
one file, not a policy.

The `write_temp_pdf` variants are worse than language: `"Failed to persist temp
file: …"` is a `tempfile` implementation detail, and `"Printer '{}' not found.
Available printers: [{}]"` dumps every device name (including network queues) into
a message designed for a 40-column receipt-width dialog.

## Why it matters

This app is deliberately Indonesian-only: every other cashier-facing string —
errors, empty states, receipts, the credit dialog — is written in Indonesian, and
the previous audits filed English leaks as regressions. A raw English sentence with
a developer noun ("temp file") on the printer screen is the one place a new
operator goes first, and it is also the screen where a POS user is least able to
translate.

## Recommended fix

1. Keep the diagnostics in the log and return one sentence per failure, in
   Indonesian, following the pattern `export.rs` already uses
   (`log::error!(…); "Gagal menyimpan file. Coba pilih folder lain."`):
   - no printers → `"Tidak ada printer terpasang. Pasang printer dulu, lalu coba lagi."`
   - printer renamed/gone → `"Printer '{name}' tidak ditemukan. Pilih printer lain di Pengaturan > Printer."`
     (log the available list, do not print it)
   - temp-file failures → `"Gagal menyiapkan berkas cetak."` (`log::error!` the OS error)
2. Do the same in `src/lib/printer.ts`'s two catch-all messages.
3. If the "which printers exist" list is genuinely useful to the operator, render
   it as a list in the printer settings UI (a separate `get_printers` result), not
   inside an error string.

## Acceptance criteria

- Every `Err(String)` returned by `printer.rs` commands is a complete Indonesian
  sentence with no Rust/OS type names, no file paths and no device enumeration.
- The English strings at `printer.rs:40,43,45,50,102,129` (and their Unix twins)
  no longer reach the UI; the raw cause is in the app log
  (`Setting → Log`).
- The Settings printer page renders the message unchanged and never shows a
  `tempfile`/`lpstat` token.

## Verification

- `cargo test -p kassir` with a new unit test per message, in the style of the
  existing `validate_pdf` tests that assert the Indonesian sentence verbatim.
- `rg -n "\"[A-Z][a-z]+ .*(failed|Failed|not found)" src-tauri/src` returns no
  user-facing string.
- Manual: rename the selected printer in Windows, press Test Print in
  Setting → Printer — expect the Indonesian sentence, and the device list in the
  log.
