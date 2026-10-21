---
slug: unused-updater-surface-and-dead-dependencies
title: "An armed auto-updater that nothing calls, and eleven unused dependencies"
severity: medium
category: security
iteration: 10
created: 2026-10-21T21:51:37.948Z
files:
  - "package.json"
  - "src-tauri/capabilities/desktop.json"
  - "src-tauri/Cargo.toml"
  - "src-tauri/tauri.conf.json"
  - "src-tauri/src/lib.rs"
  - ".github/workflows/windows-release.yml"
---

# An armed auto-updater that nothing calls, and eleven unused dependencies

- **Severity:** medium
- **Category:** security
- **Files:** `package.json`, `src-tauri/capabilities/desktop.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, `.github/workflows/windows-release.yml`
- **Iteration:** 10

## Summary

The app grants `updater:default` to the main window, initialises `tauri-plugin-updater`, ships a signing key and `createUpdaterArtifacts`, and points at a `latest.json` endpoint — but no frontend code ever checks for an update, so the most powerful capability in the app is granted to a feature with no consumer. The same pass finds eleven `package.json` dependencies that nothing imports (`@tauri-apps/plugin-{updater,opener,dialog,process}`, `jszip`, `immer`, `p-queue`, `valibot`, `fuzzysort`, `eventemitter3`, `radix-ui`), i.e. install-time supply-chain surface for libraries the code never touches.

## Details

## Evidence

The auto-updater is fully wired on the Rust and packaging side, and granted to the main window:

- `src-tauri/src/lib.rs:38` — `.plugin(tauri_plugin_updater::Builder::new().build())`
- `src-tauri/capabilities/desktop.json` — `"permissions": ["updater:default"]` for `windows: ["main"]`
- `src-tauri/tauri.conf.json` — `plugins.updater` with a `pubkey`, a GitHub `latest.json` endpoint and `installMode: "passive"`, plus `bundle.createUpdaterArtifacts: true`
- `src-tauri/Cargo.toml` — `tauri-plugin-updater = "2"`
- `.github/workflows/windows-release.yml` — publishes with `TAURI_SIGNING_PRIVATE_KEY`, so every release now produces updater artifacts and a `latest.json` nobody consumes.

Nothing in the frontend ever checks for an update. `rg -i "updat" src` finds no `check()`, `downloadAndInstall`, `Update`, or import of `@tauri-apps/plugin-updater` (only `UPDATE` SQL and `updatedAt` fields). There is no "update available" UI, no startup check, no Setting entry.

The same audit turns up dependencies nothing imports (`rg -l` returns no hit for any of them):

| package.json entry | used by |
|---|---|
| `@tauri-apps/plugin-updater` | nothing |
| `@tauri-apps/plugin-opener` | nothing (and no `tauri-plugin-opener` in `Cargo.toml`, so it could not work) |
| `@tauri-apps/plugin-dialog` | nothing — the save dialog is opened in Rust (`src-tauri/src/export.rs`) |
| `@tauri-apps/plugin-process` | nothing (the plugin is initialised in Rust, never called) |
| `jszip` | nothing |
| `immer` | nothing |
| `p-queue` | nothing |
| `valibot` | nothing (the project standardised on Zod) |
| `fuzzysort` | nothing (the search ladders use `@nozbe/microfuzz` and two in-repo scorers) |
| `eventemitter3` | nothing |
| `radix-ui` (umbrella) | nothing — every primitive is imported as `@radix-ui/react-*` |

## Why it matters

Two separate problems with one root cause — configuration that outlived the feature:

1. **A self-updating binary channel with no user-facing consumer.** `updater:default` is the permission that downloads a signed installer and runs it with `installMode: "passive"` (no confirmation dialog). The pubkey/signature check means an attacker cannot forge an update, but the *webview* can trigger one: any script running in the main window (an injected receipt image URL, a compromised PDF renderer, a future XSS) can begin a signed-install flow the cashier never asked for, and the only thing that stops it is that the signature must come from the project key. That privilege buys the app exactly nothing today, because no UI calls it — the capability's own description (`default.json`) argues at length for least privilege, while `desktop-capability` hands out the single most powerful one unused.
2. **Eleven dead dependencies** mean eleven extra supply-chain and CVE-monitoring obligations and eleven things a maintainer will assume are in play. `valibot` + `zod` and `fuzzysort` + `microfuzz` + two in-repo search ladders in particular are the kind of duplication that makes "which library do we use for this?" unanswerable later.

Neither is exploitable on its own, so this is not a critical finding — but a POS terminal that ships a dormant auto-updater is a worse default than one that ships none, and the cleanup is mechanical.

## Recommended fix

Pick a direction and make the config match it.

**If updates are coming** (they probably are, given the workflow and the pubkey): implement the consumer before the next release — a startup check behind `Setting > Tentang`, an explicit "Perbarui sekarang" confirmation, and a changelog — and keep `updater:default`. A check on launch that the cashier can decline is the minimum.

**If updates are not coming yet:** remove the surface instead of leaving it armed:

- delete `updater:default` from `src-tauri/capabilities/desktop.json` (and the whole capability file if it is then empty);
- delete `.plugin(tauri_plugin_updater::Builder::new().build())` from `lib.rs` and the dependency from `Cargo.toml`;
- delete `plugins.updater` from `tauri.conf.json` and set `bundle.createUpdaterArtifacts: false`;
- drop `@tauri-apps/plugin-updater` (and the other ten) from `package.json` with `bun remove`.

Also add a one-line comment to `desktop-capability` explaining what it is for, since today it is the only capability whose description is on the *other* file.

## Acceptance criteria

- `package.json` contains no dependency that no file under `src/` (or a config it documents) imports: at minimum `@tauri-apps/plugin-{updater,opener,dialog,process}`, `jszip`, `immer`, `p-queue`, `valibot`, `fuzzysort`, `eventemitter3` and `radix-ui` are gone, or each has a named consumer.
- Either `updater:default` is gone from every capability file, or `grep -r "plugin-updater" src` shows a real check-and-install flow with a cashier confirmation.
- `bun install` produces a lockfile diff limited to those removals, and `bun run typecheck` / `bun test` / `bun run tauri build` still succeed.

## Verification

1. `bun remove <pkg>` one at a time, running `bun run typecheck && bun test` after each — a surprise transitive use shows up as a type error, not a runtime crash.
2. `rg -n "updater" src-tauri/capabilities src-tauri/tauri.conf.json src-tauri/src/lib.rs src` to confirm the remaining references tell one consistent story.
3. Rebuild the MSI and confirm it installs and launches (the updater plugin's removal must not break `prevent-default`/`single-instance` initialisation order in `lib.rs`).
