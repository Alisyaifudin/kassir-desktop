---
slug: print-success-message-is-dead-and-leaks-bytes
title: "The printer command's success message is dead code that leaks a byte count, and \"Tes Cetak\" shows no success state"
severity: low
category: ux
iteration: 8
created: 2026-10-21T21:10:07.510Z
files:
  - "src-tauri/src/printer.rs"
  - "src/lib/printer.ts"
  - "src/pages/Setting/Printer/util-program-print.ts"
  - "src/pages/Setting/Printer/use-test.ts"
  - "src/pages/Setting/Printer/z-TestBtn.tsx"
---

# The printer command's success message is dead code that leaks a byte count, and "Tes Cetak" shows no success state

- **Severity:** low
- **Category:** ux
- **Files:** `src-tauri/src/printer.rs`, `src/lib/printer.ts`, `src/pages/Setting/Printer/util-program-print.ts`, `src/pages/Setting/Printer/use-test.ts`, `src/pages/Setting/Printer/z-TestBtn.tsx`
- **Iteration:** 8

## Summary

Recurring (folded into the iteration-7 verdict, never fixed): `printer.rs` answers `print_pdf` with "Dikirim ke printer 'X' (N byte)" in both the Win32 and CUPS branches — a developer detail aimed at a cashier — and the frontend throws the string away entirely (`programPrint` returns `null` on success, `printPdf` ignores the Ok value). The result is dead code plus a real gap: Setting → Printer → "Tes Cetak" has no success state at all (only `TextError`), so a successful test print looks identical to a click that did nothing.

## Details

## Evidence

`print_pdf` answers with a cashier-facing sentence that leaks a developer detail — the byte count of the PDF:

```rust
// src-tauri/src/printer.rs (Windows branch)
Ok(format!("Dikirim ke printer '{}' ({} byte)", printer_name, pdf_bytes.len()))
// src-tauri/src/printer.rs (CUPS branch)
Ok(format!("Dikirim ke printer '{}' ({} byte)", printer_name, pdf_bytes.len()))
```

The frontend never shows it. `src/services/Setting/Printer/util-program-print.ts` (`programPrint`) discards the Ok value and reports success as `null`:

```ts
yield* printPdf(printer.name, pdfBytes);
return null;
```

`src/lib/printer.ts` (`printPdf` → `invoke("print_pdf", …)`) never reads the string either, so the whole success channel is dead code containing a byte count.

The visible consequence is the other side of the gap: **Setting → Printer → Tes Cetak has no success state.** `src/pages/Setting/Printer/use-test.ts` returns `{ loading, error, handleClick }` and `z-TestBtn.tsx` renders only `<TextError>{error}</TextError>`, so a successful test print is indistinguishable from a click that did nothing: the spinner stops, the error line stays empty. The cashier's only proof is walking to the printer.

(The main receipt path does have feedback — `Complete` counts down "Menutup dalam 3 detik..." with the button reading "Tercetak" — but that confirms the *spooler accepted the job*, which is exactly the distinction the Rust comment already draws and then fails to communicate in the one place a human is asking "did it work?".)

## Why it matters

- **Two failures in one:** the string is wrong for a cashier (a byte count means nothing on a 58 mm receipt) and it is unreachable anyway, so it is dead code that invites a future engineer to surface it as-is.
- **Printer setup is the classic support call.** "Tes Cetak" is the only diagnostic the app offers; a silent success makes "did the print go through, or is the printer offline?" unanswerable from inside the app, which is the moment a shopkeeper starts unplugging cables.
- **The message must not promise paper.** Both branches already say "Dikirim ke printer" (sent), not "printed" — that judgement is correct and should be the visible string.

## Recommended fix

1. **Return a cashier sentence from Rust, without the byte count** — the byte count belongs in `log::info!`:
   ```rust
   log::info!("print_pdf: {} bytes sent to '{}'", pdf_bytes.len(), printer_name);
   Ok(format!("Dikirim ke printer '{printer_name}'. Periksa printer jika kertas tidak keluar."))
   ```
   Both branches (Windows `winprint`, CUPS `lp`).

2. **Carry it through to the UI.** `printPdf` should return the message (`invoke<string>`), `programPrint` should return `string | null` where `null` is still the error-free case *or* switch to a small result type `{ ok: true; message: string } | { ok: false; message: string }`; `useTestPrint` then exposes `success` and `z-TestBtn.tsx` renders it in a `role="status"` line under the button. Keep `Complete`'s behaviour ("Tercetak" + countdown) unchanged.

3. While there: `TestBtn`'s label should say what it does to paper — `"Tes Cetak"` is fine, but the success line should not be confused with the receipt dialog's flow.

## Acceptance criteria

- No cashier-visible string contains a byte count or any other number a shopkeeper cannot act on; the size lives in the log (check `Setting → Log` shows it).
- A successful "Tes Cetak" shows an explicit "Dikirim ke printer …" message (and says to check the printer for paper); a failed one still shows the existing Indonesian error.
- The receipt print path (`programPrintReceipt`, `Complete`) keeps its current error handling and its "Tercetak" countdown.

## Verification

- Setting → Printer → Tes Cetak on a machine with a printer: the message appears under the button, the spinner stops, and `Setting → Log` contains a line with the byte count.
- Repeat with the printer name cleared/offline: the existing "Printer … tidak ditemukan. Pilih printer lain" error still appears and no success line does.
- `cargo test` (the existing `validate_pdf` tests) and `cargo clippy` stay clean.
