---
slug: cart-flush-lost-on-window-close
title: "Closing the window throws away the last 100 ms of cart edits, invisibly"
severity: medium
category: correctness
iteration: 3
created: 2026-10-21T18:47:27.659Z
files:
  - "src/services/transaction/live.ts"
  - "src/services/transaction/index.ts"
  - "src/layouts/authenticated/z-Refresh.tsx"
  - "src/layouts/authenticated/index.tsx"
  - "src-tauri/src/lib.rs"
  - "src/lib/constants.ts"
---

# Closing the window throws away the last 100 ms of cart edits, invisibly

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/services/transaction/live.ts`, `src/services/transaction/index.ts`, `src/layouts/authenticated/z-Refresh.tsx`, `src/layouts/authenticated/index.tsx`, `src-tauri/src/lib.rs`, `src/lib/constants.ts`
- **Iteration:** 3

## Summary

Every cart edit reaches SQLite only through a 100 ms per-draft debounce (`schedule()` in `transaction/live.ts`), and the only `flush()` call in the whole app is the Topbar's reload button. There is no `onCloseRequested`, `beforeunload`, or `RunEvent::ExitRequested` handler, so closing the window (the normal end-of-shift action) silently drops the last edit, abandons an in-flight write, and swallows any pending `Keranjang belum tersimpan` failure the `SaveError` channel would have shown.

## Details

## Evidence

Cart edits are not written when they happen. `src/services/transaction/live.ts`:

```ts
// live.ts:652-663
    // Debounce per draft: the last edit wins and the write happens once the
    // operator pauses. Cleared on delete so a removed draft is never rewritten.
    function schedule(id: string) {
      const existing = timers.get(id);
      if (existing !== undefined) clearTimeout(existing);
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          Effect.runFork(flush(id));
        }, DEBOUNCE_DELAY),
      );
    }
```

with `DEBOUNCE_DELAY = 100` (`src/lib/constants.ts:89`). The debounce is the *only* path from an edit to disk; `flush()` exists on the service interface (`src/services/transaction/index.ts:124`) and `flushAll()` is implemented, but the whole app calls it in exactly one place:

```
$ rg "transaction\.flush" src
layouts/authenticated/z-Refresh.tsx:15:      await Effect.runPromise(service.transaction.flush());
```

The Topbar's reload button. Nothing else flushes:

```
$ rg "onCloseRequested|beforeunload|close-requested|ExitRequested|app_exit" src src-tauri/src
(no matches)
```

`src/main.tsx` mounts `<RouterProvider>` on a bare root, `src-tauri/src/lib.rs` builds the plugin stack and calls `builder.run(...)` with no `on_window_event` / `RunEvent::ExitRequested` handler, and the Tauri window has no close hook. So on Alt+F4, the taskbar close button, or a Windows shutdown:

* any edit made in the last 100 ms (`update()` → `schedule()`) is dropped — the `setTimeout` never fires because the webview is gone;
* a `flush()` that is *in flight* is abandoned mid-`db.execute`;
* a write that failed (and would have raised `<SaveError>`) is lost with the window, so the operator never learns the cart disagrees with the disk.

The same debounce also means the cart is never written while the operator is actively typing — a 100 ms gap is small, but at POS speed the last line entered before a crash (the case the `SaveError` channel was built for in the previous iteration) is exactly the one at risk.

## Why it matters

The whole point of putting the cart in SQLite (`tx_records`/`tx_listings`/`tx_extras` in `data.db`) is that a crash or a restart cannot lose the sale being rung up. That guarantee currently holds only for edits older than the debounce window plus the write time, and it silently does not hold at all for the most common shutdown path on a shop PC — closing the window when the queue is done. The recovery story is also asymmetric: a *failed* write is surfaced in the UI (`<SaveError>`), but a *lost* one is indistinguishable from a successful one, so a cashier who closes the app right after scanning the last item has no way to know the line is gone.

## Recommended fix

1. **Flush on window close, and refuse the close if it fails.** In `src-tauri/src/lib.rs`, register a close handler that asks the frontend to flush before the window is destroyed, or — simpler and frontend-only — add a `beforeunload` / `pagehide` guard plus the Tauri close event:

   ```ts
   // src/layouts/authenticated/use-flush-on-exit.ts
   import { getCurrentWindow } from "@tauri-apps/api/window";
   useEffect(() => {
     const unlisten = getCurrentWindow().onCloseRequested(async (event) => {
       const result = await Effect.runPromise(Effect.either(service.transaction.flush()));
       if (Either.isLeft(result)) {
         event.preventDefault();                       // keep the window open
         toast.error(result.left.message);
       }
     });
     return () => void unlisten.then((off) => off());
   }, []);
   ```
   Mount it once in `src/layouts/authenticated/index.tsx`, next to `useNavigationShortcuts()`. `flush()` already writes every draft and clears the per-draft timers, so no new service surface is needed.

   Note `onCloseRequested` resolves asynchronously while the webview is tearing down; if a `preventDefault()` + second close is too fiddly on the real target, the fallback accepted design is `RunEvent::ExitRequested` in Rust with `api.prevent_exit()` and an explicit `app.exit()` after the frontend acks.

2. **Do not debounce the *first* edit of a line.** Change `schedule` to write immediately when the previous write for that draft is older than the debounce window (track `lastFlushAt`), so a single scan→qty→close sequence is on disk without waiting. Cheap: reuse the existing `timers` map to decide.

3. **Surface the failure where a quit can see it.** `SaveError` is a toast/pill; make the flush-on-exit path reuse the same `saveErrorRef` message so the dialog says "Keranjang belum tersimpan: …" instead of the generic toast.

## Acceptance criteria

- Closing the window with an unsaved cart (edit, then close within 100 ms) writes the edit to `tx_listings`/`tx_extras` before the window goes away; reopening the app shows the cart with the edit.
- If the flush fails, the close is cancelled and the operator sees the `Keranjang belum tersimpan: …` message; a second close attempt is possible after the error is acknowledged.
- The Topbar reload button keeps its current behaviour (`z-Refresh.tsx` already flushes and aborts the reload on failure).
- No new listener leaks: the close handler is removed on unmount (`unlisten`), and `bun test` shows no open-handle warnings.

## Verification

- Manual: open `/pos`, type a qty, immediately Alt+F4. Reopen; `?draft=` tab still exists with the qty (inspect `sqlite:data.db` `SELECT tx_listing_qty FROM tx_listings`).
- Failure path: temporarily point the db path at a read-only file (or stub `db.transaction` to fail in a test) and confirm the window stays open with the save error.
- Unit test at the service level: with a fake `db.transaction` that resolves slowly, call `schedule` then `flush()` immediately and assert the row is written once (no double write, no lost update).
- `bun run typecheck && bun run lint && bun test` green.
