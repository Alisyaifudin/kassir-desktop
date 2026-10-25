---
slug: tauri-capability-surface
title: "Release capabilities are far wider than the app needs (no CSP, raw SQL, broad fs, dev bridge)"
severity: high
category: tauri
iteration: 1
created: 2026-10-21T17:30:55.504Z
files:
  - "src-tauri/capabilities/default.json"
  - "src-tauri/capabilities/desktop.json"
  - "src-tauri/tauri.conf.json"
  - "src-tauri/tauri.dev.conf.json"
  - "src-tauri/src/lib.rs"
  - "src-tauri/Cargo.toml"
  - "vite.config.ts"
---

# Release capabilities are far wider than the app needs (no CSP, raw SQL, broad fs, dev bridge)

- **Severity:** high
- **Category:** tauri
- **Files:** `src-tauri/capabilities/default.json`, `src-tauri/capabilities/desktop.json`, `src-tauri/tauri.conf.json`, `src-tauri/tauri.dev.conf.json`, `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `vite.config.ts`
- **Iteration:** 1

## Summary

The release window has `csp: null`, `sql:allow-execute`, recursive read/write over `$APPLOCALDATA` (where the SQLite files live), an HTTP scope pointing at a developer LAN host, `opener:default`, and the `mcp-bridge:default` automation permission; `tauri-plugin-mcp-bridge` is a normal (non-optional) dependency so it links into the release binary. Any injection or compromised dependency gets full database and filesystem write rather than a rendering bug.

## Details

## Evidence

`src-tauri/tauri.conf.json` disables the CSP entirely and leaves the window fully permissive:

```json
"security": { "csp": null }
```

`src-tauri/capabilities/default.json` (attached to the `main` window):

```json
"permissions": [
  "core:default",
  "opener:default",
  "sql:default",
  "dialog:default",
  "sql:allow-execute",
  "store:default",
  "log:default",
  "fs:default",
  "fs:allow-appdata-read-recursive",
  "fs:allow-appdata-write-recursive",
  "fs:read-dirs",
  { "identifier": "fs:read-files",  "allow": [{ "path": "$APPLOCALDATA/*" }, { "path": "$APPLOCALDATA/logs/*" }] },
  { "identifier": "fs:write-files", "allow": [{ "path": "$APPLOCALDATA/*" }, { "path": "$APPLOCALDATA/logs/*" }] },
  "http:default",
  { "identifier": "http:allow-fetch", "allow": [
      { "url": "http://192.168.225.187:8787/**" },
      { "url": "https://api.kassir.store/*" } ] },
  "mcp-bridge:default"
]
```

Specific problems:

1. **`mcp-bridge:default` is in the release capability.** The plugin itself is registered only under `#[cfg(debug_assertions)]` (`src-tauri/src/lib.rs`), so in a release build the permission is inert — but it means the ACL grants a *dev automation socket* permission by default, and if anyone ever widens the `cfg`, it ships live. It belongs in a dev-only capability file, alongside the dev config that enables `withGlobalTauri` (`src-tauri/tauri.dev.conf.json`).
2. **`tauri-plugin-mcp-bridge = "0.13.1"` sits in `[dependencies]`**, not under a `dev`/target gate, so it is compiled and linked into the release binary even though `run()` never creates it. Every dependency is attack surface and build time.
3. **`sql:allow-execute` hands raw SQL to the webview.** All app data access goes through `DatabaseService` (`src/services/db/live.ts`) which is the right shape, but the capability means any script in the webview can `Database.load("sqlite:data.db")` and run arbitrary SQL/DDL. Combined with `csp: null`, a single XSS-ish injection (e.g. a product name rendered through `dangerouslySetInnerHTML`, or a compromised dependency) becomes full database compromise rather than a rendering bug.
4. **`fs` is broader than the app needs.** The only writer is `src/lib/image.ts` (`images/**` under `AppData`) and `src/services/log/live.ts` (`logs/kassir.log` under `AppLocalData`). Recursive read/write over the whole appdata root also permits overwriting `sqlite:data.db` and `sqlite:tx.db`, which the `sql` plugin then happily uses.
5. **`http:allow-fetch` still allows a hard-coded LAN development host** `http://192.168.225.187:8787/**` in the *release* capability, while the build already points at `https://api.kassir.store` (`vite.config.ts` `define`). A production installer should not be allowed to talk to a developer's LAN box.
6. **`opener:default`** allows opening arbitrary URLs/external programs from the webview; nothing in `src/` uses `@tauri-apps/plugin-opener` (grep: only the Cargo dependency and `lib.rs` init).
7. `src-tauri/src/lib.rs` registers `tauri_plugin_http::init()` **twice** (two identical `.plugin(...)` calls) — harmless today, confusing later.

## Why it matters

- A POS runs on a shop counter with customer data and money flows; the threat model is "a bad render path, a malicious imported JSON, or a compromised npm dependency", all of which land inside a webview with `sql:allow-execute`, no CSP, and filesystem write access to the database file. Zero-click data loss or silent price tampering becomes plausible.
- Least-privilege capabilities are cheap to get right and impossible to retrofit after a release.
- The dev-only bridge and the LAN endpoint in production config are the classic "temporary" leftovers that ship forever.

## Recommended fix

1. Split capabilities: `default.json` (production: `core:default`, `sql` with only the app's own DB, `store`, `log`, `dialog`, narrow `fs`) and a `dev.json` capability (with `platforms` + a `windows` entry or a feature-gated config) holding `mcp-bridge:default`. Tauri applies capabilities per `tauri.*.conf.json`, so use `app.security` overrides in `tauri.dev.conf.json`.
2. Move `tauri-plugin-mcp-bridge` behind a feature flag or an optional target-gated dependency:
   ```toml
   [target.'cfg(debug_assertions)'.dependencies]
   tauri-plugin-mcp-bridge = { version = "0.13.1", optional = true }
   ```
3. Set a real CSP, e.g. `"csp": "default-src 'self'; img-src 'self' asset: http://asset.localhost data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'"`, and verify the pdf-lib / arraybuffer / Vite asset pipeline in a release build.
4. Narrow `fs`: only `$APPDATA/images/**` and `$APPLOCALDATA/logs/**`, read+write, non-recursive where possible. Do not grant write on `$APPLOCALDATA/*` (that is the SQLite directory).
5. Drop `sql:allow-execute` if `sql:default` suffices for `Database.load(...).execute/select` (it does not; if it is required, accept it explicitly and document it as the one intentional hole). Drop `http` LAN scope and `opener:default`.
6. Remove the duplicate `tauri_plugin_http::init()` call.

## Acceptance criteria

- Release ACL contains no `mcp-bridge:*`, no LAN URL, and filesystem write scope limited to `images/**` and `logs/**`.
- `csp` is a non-null policy and the app runs with it in a release build (print, image gallery, product form, receipt PDF all still work).
- `tauri-plugin-mcp-bridge` is not linked into the release binary (`strings target/release/kassir.exe | grep -i mcp` empty, or `cargo tree --release` shows it only with the dev feature).
- No duplicate plugin registration in `lib.rs`.

## Verification

- `bun run tauri build`, then inspect `src-tauri/target/release/bundle` app resources / `gen/schemas` for the compiled ACL.
- In the installed app, open devtools (should be unavailable), then attempt `window.__TAURI__.sql` and `window.__TAURI__.fs` calls from the console to confirm the ACL rejects them.
- `rg -n "mcp-bridge|192.168.225.187" src-tauri/capabilities src-tauri/tauri.conf.json` returns nothing.
