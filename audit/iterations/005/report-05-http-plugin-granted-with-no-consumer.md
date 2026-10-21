---
slug: http-plugin-granted-with-no-consumer
title: "The unused HTTP plugin still ships a full `http:default` grant to `api.kassir.store`"
severity: medium
category: tauri
iteration: 5
created: 2026-10-21T19:53:23.598Z
files:
  - "src-tauri/src/lib.rs"
  - "src-tauri/capabilities/default.json"
  - "src-tauri/Cargo.toml"
  - "src/lib/reqwest.ts"
  - "vite.config.ts"
  - "package.json"
---

# The unused HTTP plugin still ships a full `http:default` grant to `api.kassir.store`

- **Severity:** medium
- **Category:** tauri
- **Files:** `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src-tauri/Cargo.toml`, `src/lib/reqwest.ts`, `vite.config.ts`, `package.json`
- **Iteration:** 5

## Summary

The release build registers `tauri-plugin-http` and grants `http:default` (all fetch operations) scoped to `api.kassir.store`, but the only module that calls it — `src/lib/reqwest.ts` — is imported by nothing, and `VITE_API_URL` is dead too. That is a webview-to-network egress path that bypasses the CSP for a client that does not exist, in a capability file whose description claims least privilege.

## Details

## Evidence

The release build ships a network capability that no shipping code uses:

`src-tauri/src/lib.rs:19` registers the plugin:

```rust
.plugin(tauri_plugin_http::init())
```

`src-tauri/capabilities/default.json` grants it, twice:

```json
"http:default",
{ "identifier": "http:allow-fetch", "allow": [{ "url": "https://api.kassir.store/*" }] }
```

`http:default` is not a no-op — per `src-tauri/gen/schemas/desktop-schema.json:1969`
it "configures what kind of fetch operations are available … enables all fetch
operations", i.e. `allow-fetch`, `allow-fetch-cancel`, `allow-fetch-send`,
`allow-fetch-read-body`, `allow-fetch-cancel-body`.

The consumer does not exist. `src/lib/reqwest.ts` is the only module that calls
the plugin's `fetch`, and nothing imports it:

```
$ rg -n "fetch\(|reqwest\(" src --glob '!*.test.ts'
src/lib/reqwest.ts:6:export function reqwest(
src/lib/reqwest.ts:37:      try: () => fetch(input, init),
src/lib/reqwest.ts:  (no call sites)
```

`VITE_API_URL` is likewise dead: `vite.config.ts:44-46` still defines
`import.meta.env.VITE_API_URL` (default `https://api.kassir.store`) but no module
reads it. `.env.production` sits at the repo root for the same retired sync
client. `src-tauri/Cargo.toml:41` keeps `tauri-plugin-http = "2"` compiled in.

This is the last remnant of the sync pipeline that `.agent/agent.md` says was
deleted ("The sync pipeline is not wired up yet … Do not build on those paths").

## Why it matters

The capability file is the app's own least-privilege statement, and its
`description` carefully justifies every entry ("Least privilege on purpose…",
"`sql:allow-execute` is the one deliberate hole"). An `http:default` grant to
`api.kassir.store` with no consumer contradicts that claim, and it is the shape
of grant that matters: it lets the webview make requests that bypass the CSP
(`connect-src 'self' ipc: http://ipc.localhost`) because the request is executed
in Rust and only the URL scope is checked. Any future XSS surface — and the app
renders no user HTML today, which is exactly why the grant should not be sitting
there — turns into a working egress channel plus a way to hand data to a third
party under this app's name.

It also keeps ~three crates of HTTP stack in the MSI and in `Cargo.lock` for
nothing.

## Recommended fix

Preferred: delete it.
1. `src-tauri/src/lib.rs` — drop `.plugin(tauri_plugin_http::init())`.
2. `src-tauri/capabilities/default.json` — drop `"http:default"` and the
   `http:allow-fetch` entry, and drop the http sentence from the description.
3. `src-tauri/Cargo.toml` — remove `tauri-plugin-http`; remove the facade entry
   from `package.json` (`@tauri-apps/plugin-http`) and `src/lib/reqwest.ts`.
4. `vite.config.ts` — remove the `VITE_API_URL` define; delete `.env.production`
   if nothing else reads it.

If sync is coming back soon, keep the code but gate the capability: a separate
`sync.json` capability added only by a config that the release build does not
use (the pattern already used for `mcp-bridge.json` + `tauri.dev.conf.json`).

## Acceptance criteria

- `rg -n "tauri_plugin_http|plugin-http|api.kassir.store" src src-tauri package.json vite.config.ts`
  returns nothing (or only a dev-only capability file).
- `src-tauri/capabilities/default.json` lists no network permission.
- `src-tauri/Cargo.lock` no longer contains `reqwest`/`tauri-plugin-http`.
- `cargo check` and `bun run build` still pass; the app still loads `data.db`.

## Verification

- `bunx tauri build` (or `cargo check --release`) then inspect the generated
  `src-tauri/gen/schemas/desktop-schema.json` ACL dump for `http:` — none.
- In the packaged app, from devtools, call
  `window.__TAURI_INTERNALS__.invoke("fetch", {...})` — must reject with
  "not allowed".
- `rg -n "reqwest" src-tauri/Cargo.lock` is empty.
