---
slug: print-commands-block-main-thread
title: "Printer IPC commands run on the main thread and freeze the POS while spooling"
severity: medium
category: tauri
iteration: 2
created: 2026-10-21T18:14:10.407Z
files:
  - "src-tauri/src/printer.rs"
  - "src-tauri/src/auth.rs"
  - "src-tauri/src/lib.rs"
  - "src/lib/printer.ts"
---

# Printer IPC commands run on the main thread and freeze the POS while spooling

- **Severity:** medium
- **Category:** tauri
- **Files:** `src-tauri/src/printer.rs`, `src-tauri/src/auth.rs`, `src-tauri/src/lib.rs`, `src/lib/printer.ts`
- **Iteration:** 2

## Summary

`get_printers` and `print_pdf` are synchronous `#[tauri::command]` functions (`src-tauri/src/printer.rs:66-77`), so on Tauri v2 they run on the main thread: Win32 printer enumeration, temp-file write and `WinPdfPrinter::print` all block the webview event loop. Printing happens immediately after Bayar, so a slow or offline printer freezes the whole POS window right when the cashier needs to start the next sale. `auth.rs` already moved its blocking work to `spawn_blocking` with a comment explaining exactly this hazard; `printer.rs` was left behind.

## Details

## Evidence

`src-tauri/src/printer.rs:66-77` — both IPC commands are **synchronous**
`#[command]` functions:

```rust
#[command]
pub fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    platform::get_printers()
}

#[command]
pub fn print_pdf(printer_name: String, pdf_bytes: Vec<u8>) -> Result<String, String> {
    validate_pdf(&pdf_bytes)?;
    platform::print_pdf(&printer_name, &pdf_bytes)
}
```

In Tauri v2 a command that is neither `async fn` nor `#[tauri::command(async)]`
runs on the **main thread** — the same thread that drives the webview event loop.
What these two bodies do on that thread, on Windows:

- `printer.rs:92` / `114` / `120` — `PrinterDevice::all()`, i.e. Win32 printer
  enumeration, which blocks until the spooler answers. An offline network printer
  or a stalled spooler answers slowly. `print_pdf` calls it **twice** (once to
  find the device, again to build the "available printers" message on the
  not-found path).
- `printer.rs:44-62` + `platform::print_pdf` — `NamedTempFile` create, write,
  flush, `keep()`, then `WinPdfPrinter::print(&path, PrintTicket::default())`,
  which submits the job to the Windows spooler and can take hundreds of
  milliseconds to seconds for a large or stuck job, plus the removal of the temp
  file.

The project already knows this pattern is wrong: `src-tauri/src/auth.rs:31-39`
moved bcrypt onto `tauri::async_runtime::spawn_blocking` with the comment
"running it inline on a tokio worker would stall every other command sharing that
runtime". `printer.rs` is the same class of blocking work and has not been
converted.

Second, smaller correctness note in the same file: `platform::print_pdf`
(`printer.rs:111-150`) returns `Ok(...)` as soon as the spooler accepted the job,
so the frontend's success path (`programPrintReceipt` → `null` → the "Tercetak"
countdown in `src/pages/Pos/z-Complete.tsx`) reports a print that may still fail
in the spooler. That is acceptable for a POS, but the message should say "dikirim
ke printer", not "berhasil dicetak", so the cashier knows to look at the paper.

## Why it matters

The receipt print happens at the worst possible moment: right after Bayar, with
the next customer's goods on the counter. Blocking the main thread there freezes
the whole window — no keydown for F1/F2, no cart interaction, no spinner repaint
(React cannot commit while the webview thread is blocked, so even the "Mencetak…"
state may not paint before the freeze). On Windows with a flaky USB/network
printer that is a several-second full-app hang, and the cashier's natural
response is to hammer keys, which then all land when the block lifts.

## Recommended fix

Move both commands off the main thread, mirroring `auth.rs`:

```rust
#[tauri::command]
pub async fn print_pdf(printer_name: String, pdf_bytes: Vec<u8>) -> Result<String, String> {
    validate_pdf(&pdf_bytes)?;
    tauri::async_runtime::spawn_blocking(move || platform::print_pdf(&printer_name, &pdf_bytes))
        .await
        .map_err(|e| format!("Gagal menjalankan pencetakan: {}", e))?
}
```

Same for `get_printers`. (`print_pdf` takes ownership of `pdf_bytes` already, so
the `move` closure is free; `get_printers` needs no capture.) If you prefer not to
restructure, `#[tauri::command(async)]` on the existing sync fns also moves
execution onto the async runtime — but `spawn_blocking` is the honest signal that
this is blocking I/O.

While there: cache nothing, but stop calling `PrinterDevice::all()` twice on the
error path, and change the success string to "Dikirim ke printer '{name}'".

## Acceptance criteria

- Neither command touches the main thread: the sync bodies in `printer.rs:67`
  and `:72` are gone, replaced by `async` wrappers around `spawn_blocking`.
- With a deliberately unresponsive printer selected (a shared printer pointed at
  a dead host), the POS window keeps responding — the cart grid still moves with
  the arrow keys and the button shows "Mencetak..." while the print is in flight.
- The error path for an unknown printer still returns the Indonesian message with
  the available printer names, and no panic: `rg -n "unwrap\(\)|expect\("
  src-tauri/src` stays limited to `lib.rs`'s startup `expect`.
- `cargo check` on Windows clean; the temp PDF is still removed on both the
  success and the failure path.

## Verification

```
cd src-tauri && cargo check
```

Manual on Windows: select a printer, print a receipt, and while the job spools
press F1/F2 and arrow keys — focus must move. Then stop the Print Spooler service
and press Cetak: the app must show the error, not hang or crash.
