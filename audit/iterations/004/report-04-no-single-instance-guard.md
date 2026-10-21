---
slug: no-single-instance-guard
title: "No single-instance guard, so a second launch runs a second process against the same `data.db`"
severity: medium
category: tauri
iteration: 4
created: 2026-10-21T19:20:28.075Z
files:
  - "src-tauri/Cargo.toml"
  - "src-tauri/src/lib.rs"
  - "src-tauri/tauri.conf.json"
  - "src/services/transaction/live.ts"
  - "src/services/product/live.ts"
---

# No single-instance guard, so a second launch runs a second process against the same `data.db`

- **Severity:** medium
- **Category:** tauri
- **Files:** `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `src/services/transaction/live.ts`, `src/services/product/live.ts`
- **Iteration:** 4

## Summary

Neither `Cargo.toml` nor `lib.rs` registers `tauri-plugin-single-instance`, while the app preloads one fixed `sqlite:data.db` and holds the cart and the catalogue as process-local `SubscriptionRef`s with a debounced per-draft writer. A second launch therefore opens the same file from a second process with independent, silently stale state: last-writer-wins on cart rows, cached prices and stock, and two FIFO drains on the same lot — the exact stale-state failure the audits keep removing inside the process.

## Details

## Evidence

There is no single-instance guard anywhere in the Rust side.

- `src-tauri/Cargo.toml` `[dependencies]`: `tauri-plugin-prevent-default`, `tauri`, `core`, `sql`, `bcrypt`, `store`, `process`, `log`, `fs`, `http`, `tempfile`, `dialog` — no `tauri-plugin-single-instance`.
- `src-tauri/src/lib.rs:8-41` registers `dialog`, `http`, `fs`, `log`, `process`, `updater`, `store`, `sql` and the four commands. No `.plugin(tauri_plugin_single_instance::init(..))`.
- `src-tauri/tauri.conf.json` preloads one database: `"sql": { "preload": ["sqlite:data.db"] }` in the app-data dir, i.e. a fixed path shared by every process.
- `rg -i 'single.instance' src src-tauri` matches only the audit prompt text in `scripts/audit-loop/prompts.ts`.

The frontend state model assumes a single writer for that file:

- `src/services/transaction/live.ts:478-490` keeps the live cart in a process-local `SubscriptionRef`, a per-draft `timers` debounce map and a `written` map of "the last version known to be on disk". `flush()` writes only `statementsForChange(written.get(id), draft)`.
- `src/services/product/live.ts` holds the catalogue in another `SubscriptionRef` and decides "unchanged" by comparing values against its own previous snapshot.

## Why it matters

Launching the MSI shortcut twice (double-click on a slow machine, two Start-menu entries, a leftover process after a crash) gives **two processes with two connection pools to the same `data.db`, each with its own cart refs and its own catalogue projection**. Consequences, all silent:

1. **Cart rows are last-writer-wins.** Both instances `INSERT … ON CONFLICT DO UPDATE` the same `tx_records`/`tx_listings` rows from stale snapshots, so the second window's debounced flush can restore a quantity the first one just changed. `written` is per process, so neither notices.
2. **Stale prices and stock.** Nothing in `ProductService` or `ListingService` observes another process: window B's `hydrate()` will not re-emit, so the POS in window A keeps selling the price/stock it cached at launch — the exact class of bug the last three iterations removed *inside* the process (`catalogue-invalidation-by-wall-clock`, `listing-live-cache`).
3. **Concurrent stock drains.** Two cashiers can ring up the same last lot; FIFO allocation is computed per process from a cached `stocks` snapshot, so both write a journal entry and the lot goes deeper negative than either screen showed.
4. The updater runs with `"installMode": "passive"` (`tauri.conf.json`), so an update can begin installing while a second instance still holds the database file open.

This is the desktop-lifecycle item the audit checklist asks for and the only remaining one in the Tauri layer: the ACL is narrow, the CSP is real, the printer/auth commands are on `spawn_blocking`, the migration chain is regression-tested, and no debug surface ships in release.

## Recommended fix

1. Add `tauri-plugin-single-instance = "2"` to `src-tauri/Cargo.toml` and register it **first** in `src-tauri/src/lib.rs` (the plugin must be the first one registered so it wins the race before any window or DB plugin initialises):

   ```rust
   .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
       if let Some(window) = app.get_webview_window("main") {
           let _ = window.unminimize();
           let _ = window.set_focus();
       }
   }))
   ```

   No capability entry is needed. Keep it outside the `#[cfg(debug_assertions)]` blocks so the harness speaks one process, and note in the comment *why* it exists (one SQLite file, one cart in memory).
2. Belt and braces, cheap: on boot, if the app cannot acquire an exclusive lock/`busy` timeout on `data.db`, show a clear message ("Kassir sudah berjalan di jendela lain") instead of surfacing a raw `Gagal mengeksekusi query: database is locked`. Not required if the plugin is in.
3. Do **not** try to make the app multi-process-safe (cross-process invalidation); for a single-till POS, one window is the correct model.

## Acceptance criteria

- Double-clicking the shortcut while the app is running focuses the existing window and does not start a second process (Task Manager: one `kassir.exe`).
- `src-tauri/Cargo.toml` and `lib.rs` contain the plugin; the `rust` CI job (`cargo fmt --check`, `cargo clippy -D warnings`) stays green.
- A short comment in `lib.rs` records the reason (shared `sqlite:data.db`, in-memory cart/catalogue per process) so the plugin is not removed as "unnecessary" later.

## Verification

- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` (the CI gate).
- Manual: launch the app, then launch it again from the Start menu; observe one process and the first window coming to the front (also while minimised).
- `bun test` / `bun run test:e2e` unaffected (the e2e harness runs in Chromium, where the plugin does not exist).
