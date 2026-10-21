---
name: e2e
description: How to drive and end-to-end test the running Kassir Tauri app from an agent — the debug-only MCP bridge (tauri-plugin-mcp-bridge, localhost:9223), the `tauri-mcp` CLI commands for screenshots/DOM snapshots/clicks/IPC capture, how to start the app for automation, and the sandbox/isolation caveats (real SQLite DB, printers, updater). Use whenever asked to test the app end to end, reproduce a UI bug in the real app, click through a flow, verify IPC/Rust commands, or debug a webview issue.
---

# Driving the Tauri app end to end

The desktop shell cannot be automated with Playwright/Puppeteer — Linux uses
WebKitGTK and macOS uses WKWebView, neither of which speaks CDP. Automation
goes through a debug-only Rust plugin instead.

## What is already wired up

| Piece | Where |
|---|---|
| `tauri-plugin-mcp-bridge` dependency | `src-tauri/Cargo.toml` |
| Plugin registration (debug builds only) | `src-tauri/src/lib.rs`, after `invoke_handler` |
| `withGlobalTauri: true` (dev only) | `src-tauri/tauri.dev.conf.json` |
| `mcp-bridge:default` capability | `src-tauri/capabilities/default.json` |
| `tauri:dev` script | `package.json` → `tauri dev --config src-tauri/tauri.dev.conf.json` |
| MCP server registration | `.pi/mcp.json` |

Three things must all hold or the webview tools time out after 2000 ms:

1. `withGlobalTauri: true` — the plugin's JS shim calls
   `window.__TAURI__.core.invoke('plugin:mcp-bridge|…')`. Without it every
   webview tool fails.
2. `mcp-bridge:default` in `capabilities/default.json` — without the ACL
   permission the shim's callback is rejected and the call times out. This is
   the failure that looks identical to (1); check both.
3. The plugin is only registered under `#[cfg(debug_assertions)]`.

Symptom of (1) or (2): `ipc-get-backend-state` works fine (pure Rust) while
`webview-execute-js`, `webview-find-element`, `webview-screenshot`, and
`webview-dom-snapshot` all return `Request timeout after 2000ms`.

## Start the app for automation

```bash
bun run tauri:dev          # must be the :dev variant — plain `tauri dev` lacks withGlobalTauri
```

Wait for two log lines before driving it:

```
[MCP][PLUGIN][INFO] MCP Bridge plugin initialized for 'kassir' (com.kassir.app) on 127.0.0.1:9223
[MCP][WS_SERVER][INFO] WebSocket server listening on: 127.0.0.1:9223
```

Then let migrations settle — the first boot applies the full migration set and
blocks the webview for ~10 s per large migration (`rows_affected` in the log).
Webview tool calls time out until it finishes. Budget ~60 s after launch.

Because the same `data.db` and `tx.db` the app ships with are opened, **any
interaction writes to real local data.** Clicking a nav tab can create a parked
cart row. Prefer read-only flows, and say so when a test mutated data.

## Driving it

The MCP server is registered in `.pi/mcp.json`, so its tools appear as
`mcp__tauri__webview_find_element` and friends after `/reload`. For scripted
work, call the same tools from bash:

```bash
TM="npx -y -p @hypothesi/tauri-mcp-cli tauri-mcp"

$TM driver-session start --port 9223      # once per app launch
$TM driver-session status --json
```

| Need | Command |
|---|---|
| See the UI | `$TM webview-screenshot --format png --file /tmp/shot.png` |
| Read the UI (best for agents) | `$TM webview-dom-snapshot --type accessibility` |
| Find an element | `$TM webview-find-element --selector "h1"` / `--strategy text --selector "Stok"` |
| Click / type | `$TM webview-interact --action click --selector "ref=e14"` |
| Keyboard | `$TM webview-keyboard --action type --selector "#x" --text "abc"` |
| Wait properly | `$TM webview-wait-for --type selector --selector "[data-x]"` |
| Run JS (needs IIFE to return) | `$TM webview-execute-js --script "(() => location.href)()"` |
| Call a Rust command | `$TM ipc-execute-command --command get_printers` |
| Watch every invoke | `$TM ipc-monitor --action start` then `$TM ipc-get-captured` |
| App/metadata | `$TM ipc-get-backend-state --json` |
| Console + Rust logs | `$TM read-logs --source console` / `--source system` |

Notes that save time:

- Accessibility refs (`ref=e14`) come from a fresh `webview-dom-snapshot` and go
  in `--selector`, not a `--ref` flag.
- Ambiguous text selectors are rejected with the candidate list — pass `--nth`
  or switch to a ref. That error message is the fastest way to discover the
  right element when two buttons share a label.
- `webview-execute-js` needs an IIFE to return a value: `(() => expr)()`, not
  `() => expr`.
- `--call-timeout <ms>` only bounds the CLI call, not the plugin's internal 2 s
  webview eval limit.
- Screenshots are CSS-pixel coordinates: multiply image coords by the reported
  scale to click.

## Debugging a stuck automation session

1. `ss -lntp | grep 9223` — is anything listening?
2. `$TM ipc-get-backend-state --json` — Rust side reachable? If yes but the
   webview tools time out, it is (1) or (2) above.
3. `$TM read-logs --source console` — app-side JS errors.
4. `tail -f` the dev log — migrations still running, or a panic.
5. If the port is stale after a crash, restart the app; the plugin scans
   ports 9223 upward.

## What this is not

This is an interactive/exploratory loop for a human-in-the-loop agent, not a
regression suite. It has an LLM in the loop, no assertions, and it mutates the
dev database. For deterministic CI coverage use
`@wdio/tauri-service` (embedded WebDriver provider), which needs
`tauri-plugin-wdio` + `tauri-plugin-wdio-webdriver` and a release binary. For
fast pre-commit UI coverage, prefer running the frontend in Chrome against
`vite` with the `live.ts` layers under `src/services/*/` and
`src/lib/{printer,auth,reqwest,image,log}.ts` swapped for fakes — that seam is
the only place `@tauri-apps/*` is imported.
