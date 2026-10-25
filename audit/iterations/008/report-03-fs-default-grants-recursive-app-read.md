---
slug: fs-default-grants-recursive-app-read
title: "`fs:default` still grants recursive read of every app-specific directory, including the SQLite database, while the capability says least privilege"
severity: medium
category: security
iteration: 8
created: 2026-10-21T21:08:24.732Z
files:
  - "src-tauri/capabilities/default.json"
  - "src-tauri/gen/schemas/desktop-schema.json"
  - "src/lib/image.ts"
  - "src/services/log/live.ts"
  - "src-tauri/src/export.rs"
  - "src-tauri/tauri.conf.json"
---

# `fs:default` still grants recursive read of every app-specific directory, including the SQLite database, while the capability says least privilege

- **Severity:** medium
- **Category:** security
- **Files:** `src-tauri/capabilities/default.json`, `src-tauri/gen/schemas/desktop-schema.json`, `src/lib/image.ts`, `src/services/log/live.ts`, `src-tauri/src/export.rs`, `src-tauri/tauri.conf.json`
- **Iteration:** 8

## Summary

Recurring (named in the iteration-6 and iteration-7 verdicts, still present): `src-tauri/capabilities/default.json` still grants `fs:default`, which by Tauri's own schema includes `read-app-specific-dirs-recursive` over AppConfig/AppData/AppLocalData/AppCache/AppLog — i.e. recursive read of the directory that holds `sqlite:data.db`, the Tauri Store and the logs. The explicit `fs:read-files`/`fs:write-files` scopes narrow the commands the app calls, so `fs:default` only adds reach, not function — and the capability's own description ("the only filesystem paths the app touches are `$APPDATA/images` and `$APPLOCALDATA/logs`") is now false, which is how a real over-grant survived three audits.

## Details

## Evidence

`src-tauri/capabilities/default.json` keeps `fs:default` alongside an explicit, narrow allow-list, and its own description claims the opposite of what that set grants:

```json
"description": "Capability for the main window. Least privilege on purpose: the only filesystem paths the app touches are `$APPDATA/images` (product covers, read+write) and `$APPLOCALDATA/logs` …",
"permissions": [
  "core:default",
  "sql:default",
  "sql:allow-execute",
  "store:default",
  "log:default",
  "fs:default",
  { "identifier": "fs:read-files", "allow": [ { "path": "$APPDATA/images" }, … ] },
  { "identifier": "fs:write-files", "allow": [ … ] }
]
```

From Tauri's own generated schema (`src-tauri/gen/schemas/desktop-schema.json:146`), `fs:default` includes:

- `create-app-specific-dirs`
- **`read-app-specific-dirs-recursive`** — "read access to the application specific directories (AppConfig, AppData, AppLocalData, AppCache, AppLog) and all files and sub directories created in it"
- `deny-default`

So the webview can recursively read *every* app-specific directory, not just the two paths the explicit `fs:read-files` scope names — and the `fs:read-files` / `fs:write-files` scope entries are what actually restrict the *commands* the app uses (`exists`, `mkdir`, `readFile`, `writeFile`, `remove` in `src/lib/image.ts:1` and `src/services/log/live.ts:1`).

The app's own data sits inside those directories. `src/services/db/live.ts:8` opens `sqlite:data.db` through `@tauri-apps/plugin-sql` with `"preload": ["sqlite:data.db"]` (`src-tauri/tauri.conf.json`), i.e. under the app's data/config dir — the same tree `read-app-specific-dirs-recursive` opens. Today only `src/lib/image.ts` and `src/services/log/live.ts` use the plugin, but the *permission* is not limited to what the code currently calls; any script that runs in the webview (a compromised dependency, an XSS from a rendered field, a devtools paste) can read the whole SQLite file, the Tauri Store file and the logs.

`fs:default` has now been carried through at least three iterations: iteration 7's verdict named it as the reason `tauri` was capped at 92 ("`fs:default` still grants recursive read over the app dirs — making the capability description overstate its own narrowness"). It has never been filed or changed.

I did **not** attempt to remove it and see what breaks, so the exact replacement set is a task, not a one-line assertion — see the fix.

## Why it matters

- **The permission is wider than the app's attack surface needs**, which is the whole point of Tauri capabilities. A capability that grants recursive read of the directory that holds the ledger cannot be described as least-privilege, and the description now actively misleads the next auditor/engineer into thinking it is.
- **It weakens the second layer of defence.** The design (documented in `src/components/cart/use-inert-app.ts` and `src/lib/export.ts`) assumes the ACL is the thing that stops the frontend from naming a path. `export_file` exists precisely because "a frontend `writeFile` on a location the user picked never worked in a packaged build" — but that reasoning only holds for writes. Reads of the database file *are* allowed, so the SQL-derived data has a second, unchecked path out.
- **`sql:allow-execute` is already the deliberate hole**; stacking an unrelated recursive fs read on top makes the capability file unable to answer "what can this webview touch?" without reading the plugin's schema.

## Recommended fix

1. **Delete `"fs:default"`** from `permissions` and add back only the individual permissions the five calls in `src/lib/image.ts` need:
   - `fs:allow-exists`, `fs:allow-read-file` (covered by `fs:read-files`),
   - `fs:allow-write-file`, `fs:allow-remove` (covered by `fs:write-files`),
   - `fs:allow-mkdir` scoped to `$APPDATA/images` (what `create-app-specific-dirs` was providing, without the recursive read).
   Keep the two scope blocks exactly as they are: `$APPDATA/images` and `$APPLOCALDATA/logs` (`src-tauri/capabilities/default.json:16-31`).

2. **Or remove the fs plugin from the ACL entirely** — the better long-term shape, and consistent with `export.rs`: product images and the log file are the only fs users, and both are fixed, app-owned paths. A `save_image` / `read_image` / `delete_image` / `tail_log` pair of Rust commands (with the same validation style as `printer::validate_pdf`) would let `fs:*` disappear from the capability file, the same way the HTTP plugin already did.

3. **Make the description honest either way**: state which commands are enabled and which paths they are scoped to, and name `sql:allow-execute` as the remaining hole (it already does that part).

4. Add a guard so this cannot silently regress: a small test in `src/services/db/*.test.ts`-style that parses `src-tauri/capabilities/*.json` and asserts no `fs:default` / no `fs:*recursive*` permission is present, and that every `$…` scope path is in an allow-list of the two directories.

## Acceptance criteria

- `src-tauri/capabilities/default.json` contains no `fs:default` and no permission whose schema description mentions "recursive" access to app-specific dirs.
- Every fs call the app makes still works in a **packaged** build: product image add/read/delete (`src/lib/image.ts`) and the Setting → Log page (`src/services/log/live.ts`).
- A frontend `readFile("data.db", { baseDir: BaseDirectory.AppData })` (or `readTextFile` on the store file) is rejected with `PathForbidden` in both dev and release.
- The capability description matches the permission list, and a test fails if `fs:default` comes back.

## Verification

- `bun run tauri:build` → install the MSI → product detail → add an image, view it, delete it; Setting → Log shows lines; no permission error in the log.
- In the packaged build's devtools, run `await window.__TAURI__.fs.readTextFile('data.db', { baseDir: window.__TAURI__.fs.BaseDirectory.AppData })` (or the equivalent through the plugin import) and confirm it throws.
- `bun test` for the new capability guard test.
