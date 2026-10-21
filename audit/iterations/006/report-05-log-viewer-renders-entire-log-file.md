---
slug: log-viewer-renders-entire-log-file
title: "The Log page renders every line of the log file, and hides the warnings without saying so"
severity: medium
category: performance
iteration: 6
created: 2026-10-21T20:21:03.274Z
files:
  - "src/pages/Setting/Log/page.tsx"
  - "src/services/log/live.ts"
  - "src-tauri/src/lib.rs"
---

# The Log page renders every line of the log file, and hides the warnings without saying so

- **Severity:** medium
- **Category:** performance
- **Files:** `src/pages/Setting/Log/page.tsx`, `src/services/log/live.ts`, `src-tauri/src/lib.rs`
- **Iteration:** 6

## Summary

Setting → Log reads the whole `logs/kassir.log`, reverses it and renders one `<p>` per line with no cap or virtualization — a cost proportional to how long the app has been running, on the page you open when the app is misbehaving. The same function also silently drops every `[WARN]` line from what the viewer claims is the log history.

## Details

## Evidence

The log viewer reads the whole file and renders every line, in one pass:

```ts
// src/services/log/live.ts:12-27
function readLines(): Effect.Effect<string[], LogError> {
  return Effect.tryPromise({
    try: () => readTextFile(LOG_PATH, FILE),
    catch: () => new LogError({ message: "Gagal membaca log" }),
  }).pipe(
    Effect.map((text) =>
      (text || "")
        .split("\n")
        .filter((line) => !line.includes("[WARN]"))
        .reverse(),
    ),
  );
}
```

```tsx
// src/pages/Setting/Log/page.tsx:31-42
function Lines() {
  const res = useStream(service.logs.lines.changes);
  return (
    <Loader res={res} fallback={<LoadingLines />}>
      {({ data: lines }) =>
        lines.map((line, i) => (
          <p className="text-white text-small" key={i}>
            {line}
          </p>
        ))
      }
    </Loader>
  );
}
```

There is no cap, no windowing, no pagination: the number of DOM nodes is whatever the log
file happens to hold, and the logger is configured at `LevelFilter::Info` for the whole app
(`src-tauri/src/lib.rs:26-30`), writing on every service error and every
`log.info` in the codebase. A shop that leaves the POS open for a shift accumulates
thousands of lines; the file is only bounded by the log plugin's rotation.

Every subscribe **and every `clear()`** re-reads the entire file
(`revisionRef.changes.pipe(Stream.mapEffect(() => readLines()))`, `log/live.ts:38-40`),
so opening the page twice pays twice, and the `LoadingLines` skeleton (30 fake rows, same
file) does not hint that the real view is unbounded.

Secondary, same function: `.filter((line) => !line.includes("[WARN]"))` silently **hides
warnings from the log viewer**. Warnings are exactly the lines a shopkeeper would be asked
to read back to support ("printer warning", a retried write), and the filter is invisible
in the UI — the page presents itself as "Riwayat Log".

## Why it matters

Setting → Log is the screen an operator opens *when something is already wrong* — often
with a slow or hung app. It is the one page that must never be the reason the app freezes,
and today its cost is proportional to how long the app has been running. Rendering tens of
thousands of `<p>` nodes into a scroll container blocks the main thread for seconds, which
reads as "the log page crashed the app" at exactly the wrong moment.

The hidden `[WARN]` filter is the quieter half of the same defect: the viewer's output is
not what the file says, and nothing on screen says so.

## Recommended fix

1. **Cap what the service returns.** Read the tail only — `readLines()` should slice to the
   last N lines (500 is plenty for a viewer) after splitting, before mapping:
   `lines.slice(-LIMIT).reverse()`. Keep the full file on disk as the record; the viewer is
   a window onto it.
2. **Virtualize or paginate the list.** With a 500-line cap a plain list is fine; if you
   want the whole file, use `@tanstack/react-virtual` (already a dependency, used by the
   POS search results) and load pages on scroll.
3. **Make the filter explicit or drop it.** If `[WARN]` lines must stay out of the default
   view, show a filter control with the count ("12 peringatan disembunyikan") instead of a
   silent `.filter`; otherwise remove it and let the page show what the file says.
4. Show the size/shape of what is displayed ("500 baris terakhir dari 43.210") so the
   operator knows the view is a window, not the whole file.

## Acceptance criteria

- Opening Setting → Log reads and renders a bounded number of lines (≤ 500) regardless of
  the file size; time-to-first-paint is independent of file length.
- `clear()` still re-reads and shows an empty list.
- The viewer states whether it is showing the tail and how many lines exist.
- Warnings are either shown or explicitly reported as hidden.
- A test seeds ~50,000 lines into a fake log file and asserts the service returns ≤ 500 and
  the component renders ≤ 500 nodes.

## Verification

- Unit test on `readLines`/the service with a large fixture (the log service is injectable
  via the fs plugin in the existing happy-dom harness, or extract the pure
  `split/tail/reverse` step and test that).
- Manual: with a multi-megabyte `logs/kassir.log`, open Setting → Log on Windows and
  confirm the page paints immediately and the DOM node count stays bounded.
- `bun test && bun run lint && bun run typecheck`.
