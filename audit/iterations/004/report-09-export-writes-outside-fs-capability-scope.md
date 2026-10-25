---
slug: export-writes-outside-fs-capability-scope
title: "Both JSON exports write outside the fs capability scope, so `writeFile` is rejected as `PathForbidden`"
severity: high
category: tauri
iteration: 4
created: 2026-10-21T19:23:09.556Z
files:
  - "src-tauri/capabilities/default.json"
  - "src/pages/Setting/Data/util-file.ts"
  - "src/pages/Money/History/z-Download.tsx"
  - "src/lib/image.ts"
  - "src/services/log/live.ts"
  - "src-tauri/src/lib.rs"
---

# Both JSON exports write outside the fs capability scope, so `writeFile` is rejected as `PathForbidden`

- **Severity:** high
- **Category:** tauri
- **Files:** `src-tauri/capabilities/default.json`, `src/pages/Setting/Data/util-file.ts`, `src/pages/Money/History/z-Download.tsx`, `src/lib/image.ts`, `src/services/log/live.ts`, `src-tauri/src/lib.rs`
- **Iteration:** 4

## Summary

`fs:write-files` is scoped to `$APPDATA/images` and `$APPLOCALDATA/logs`, but Setting > Data's "Simpan Data" and Money > History's "Unduh" call `writeFile` on the absolute path the user picks in the Save dialog (`pages/Setting/Data/util-file.ts:28`, `pages/Money/History/z-Download.tsx:59`). Tauri's fs plugin returns `PathForbidden` for any path outside that scope, so both exports fail in the packaged app — and surface the raw plugin sentence ("maybe it is not allowed on the scope for allow-write-file…") to the cashier. The narrow ACL the last audits asked for silently disabled a feature because the code was never adjusted to it.

## Details

## Evidence

Two shipped export features write to a path the capability does not allow.

`src-tauri/capabilities/default.json` scopes every filesystem write to two directories:

```json
{ "identifier": "fs:write-files",
  "allow": [
    { "path": "$APPDATA/images" }, { "path": "$APPDATA/images/**" },
    { "path": "$APPLOCALDATA/logs" }, { "path": "$APPLOCALDATA/logs/**" }
  ] }
```

`fs:default` (also granted) does **not** widen this: its description in the plugin crate is "read access to the application specific directories … create all of these folders via `mkdir`" — no arbitrary-path write. No Rust code extends the scope at runtime either: `rg 'allow_file|FsExt|scope' src-tauri/src` matches only `.plugin(tauri_plugin_fs::init())` in `lib.rs:12`.

Now the two call sites that write wherever the user picked in the Save dialog:

```ts
// src/pages/Setting/Data/util-file.ts:18-30
const filePath = yield* Effect.tryPromise({ try: () => save({ title: "Simpan Data", defaultPath, filters: [...] }), ... });
if (filePath === null) return;
yield* Effect.tryPromise({ try: () => writeFile(filePath, bytes), ... });   // absolute path
```

```ts
// src/pages/Money/History/z-Download.tsx:44-61 — the same program again
defaultPath: `${Date.now()}-${pocket.name}.json`,
...
writeFile(filePath, bytes)
```

Both are reached from real UI: `Setting > Data` (`pages/Setting/Data/page.tsx`, the `download-title` card) and `Money > History > Unduh` (`pages/Money/History/z-Download.tsx`).

The other two writers stay inside the scope and therefore work: `src/lib/image.ts:33` (`images/<key>` with `BaseDirectory.AppData`) and `src/services/log/live.ts:36` (`logs/kassir.log` with `BaseDirectory.AppLocalData`) — which is exactly how the capability was written, i.e. the export path was never included.

Tauri's fs plugin enforces this in `resolve_path` (`tauri-plugin-fs/src/commands.rs`): if neither the global scope nor the command scope allows the resolved path, a release build returns

```rust
return Err(CommandError::Plugin(Error::PathForbidden(resolved_path)));
```

and a debug build returns `"forbidden path: {path}, maybe it is not allowed on the scope for `allow-write-file` permission in your capability file"`.

## Why it matters

- **The export features cannot work in the installed MSI.** "Simpan Data" and "Unduh" prompt for a location (Desktop, Documents, a flash drive), then fail on the write. The shop owner's only backup path for a pocket ledger or an export is broken, and there is no second export route.
- **The failure is unreadable.** `IOError` message-of surfaces the raw plugin string (`forbidden path: C:\Users\…, maybe it is not allowed on the scope for 'allow-write-file' permission in your capability file`) — a developer sentence in English, shown to a cashier, on the screen that was supposed to reassure them their data is saved.
- It is the mirror image of the iteration-2 ACL work: the capability is correctly narrow, but the code was never adjusted to the scope it declares — so the narrowness silently disabled a feature instead of constraining it.

## Recommended fix

Pick one, in order of preference:

1. **Move the write behind a Rust command (preferred — keeps the ACL at two directories).** Add `export_file(default_name: String, bytes: Vec<u8>) -> Result<Option<String>, String>` in Rust that opens the save dialog with `tauri-plugin-dialog`'s Rust API, writes with `std::fs`, and returns the chosen path (or `None` on cancel). The frontend then calls `invoke` through a small service (`src/services/export/live.ts`, mirroring `lib/printer.ts`'s shape) and never names a path. Then drop `fs:*` write scopes for arbitrary paths entirely and remove `dialog:default` from the capability if nothing else needs it.
2. **If the frontend must keep writing,** widen the scope deliberately to the two directories a save dialog is allowed to target and constrain the dialog to them:
   ```json
   { "path": "$DOCUMENT/**" }, { "path": "$DOWNLOAD/**" }
   ```
   plus `defaultPath: "$DOCUMENT/<name>.json"`-style hints, and document in the capability's `description` why those two exist.
3. Either way, stop duplicating the program: `util-file.ts` and `z-Download.tsx` are the same "serialise → ask → write" sequence, and the Money copy also interpolates an unsanitised `pocket.name` into `defaultPath` (`\`, `:` or `..` in a pocket name becomes part of the path). One `src/services/export` (or `src/lib/export.ts`) with a typed error, and a friendly `IOError` message ("Gagal menyimpan file. Coba pilih folder lain.") instead of the raw plugin error.

## Acceptance criteria

- In a release build, "Simpan Data" (Setting > Data) and "Unduh" (Money > History) write the JSON to the location the user picks, and cancelling writes nothing and reports nothing.
- The capability file still lists no more filesystem scope than the app needs (grep: no `$HOME/**`, no `**` wildcard at the root).
- A failed write shows an Indonesian, actionable message; the raw plugin string is logged (`log.error`) rather than rendered.
- The export program exists once.

## Verification

- `bun run tauri build` (or a `tauri build --debug` MSI) and click through both dialogs on Windows — a scope error only reproduces in a packaged build the same way it does in dev, so test both.
- `diff` the capability `description` against the actual `fs` call sites (`rg 'writeFile|writeTextFile|readTextFile' src`) to confirm every path is inside a listed scope.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` and the `rust` CI job stay green.
