# Kassir

Aplikasi untuk kasir.

![beranda](./docs/static/img/shop.png)

# TODO

- tambah extra baru harusnya revalidate cache
- add indexing on product-events for performance

# Sinkronisasi

One device mirrors its SQLite database to a Cloudflare Worker over a **byte-stream**
protocol (contract: `backend-docs/sync-contract.md`). It runs **manually** — the
operator presses a button; there is no timer and nothing syncs in the background.

The transport lives in Rust, not the webview: the window CSP is
`connect-src 'self' ipc:`, so a `fetch` to the sync host is blocked before it leaves,
and the WebViews we ship on have no reliable streaming request body.
`src-tauri/src/sync.rs` owns the socket and pushes NDJSON lines to JS one per Tauri
`Channel` message; `src/services/sync/stream.ts` turns that back into the
`ReadableStream`-shaped reader the rest of the code is written against.

## One run, three stages

1. **Unduh (pull)** — `GET /v1/pull?since=&limit=` in a loop, decoding frames as they
   arrive and holding them. Nothing is written in this stage, so the cursor cannot run
   ahead of the data.
2. **Simpan (merge)** — the whole pull is applied in **one transaction** through the
   `sync_merge` command. `tauri-plugin-sql` has no transaction handle (its `execute`
   runs a multi-statement string statement by statement in autocommit), so that command
   borrows the plugin's own pool — it publishes `DbInstances` and `DbPool::Sqlite` — and
   runs `BEGIN … COMMIT` on one connection. All or nothing; the pull cursor advances only
   after the commit returns.
3. **Unggah (push)** — the unsync set, entity by entity in a fixed order, in chunks of
   ≤200 frames / 512 KB. Each `PATCH` carries the uncompressed byte offset plus the
   sha256 prefix hash of the bytes before it, and the gateway streams one ack per frame
   (`applied` / `stale` / `noop`).

## What syncs

Fourteen entities, always in this order so a parent precedes its children:
`pocket → money → product → product_name → property → listing → image → customer →
supplier → extra → method → social → product_event → record`.

- A `record` travels as **one aggregate frame** carrying all five child arrays
  (`record_listings`, `record_methods`, `record_extras`, `record_images`, `discounts`).
- **Conflicts** are last-writer-wins on `_updated_at`; a tie goes to the server, and the
  client learns about it from a `stale` ack payload rather than a pull row.
- **Deletes** are `_deleted_at` tombstones and merge like any other update.
- `product_events` is an **append-only** journal: `INSERT OR IGNORE`, never updated.
- `stocks` is a **local cache** of that journal and never syncs. `cashiers` (local
  login) never syncs either.

## Cursors

In `store.json`, next to the server config: `sync.last_pulled_seq`,
`sync.upload_id`, `sync.upload_offset`, `sync.upload_frames`, `sync.upload_chain`,
plus `sync.base_url` and `sync.token`.

`Sinkronisasi Ulang` clears them, deletes the upload session and marks every syncable row
unsynced before running the same three stages — the remedy when the device and the server
disagree.

## Where it lives

| Path | Role |
|---|---|
| `src-tauri/src/sync.rs` | HTTP + stream transport, sessions, chain hash, cancellation |
| `src-tauri/src/sync_merge.rs` | the merge as one real SQLite transaction |
| `src/services/sync/schema.ts` | canonical column order for every table (the wire contract) |
| `src/services/sync/frames.ts` | NDJSON frame encode/decode |
| `src/services/sync/sql.ts`, `merge.ts` | LWW upserts, aggregate replacement, reference resolution |
| `src/services/sync/pull.ts`, `push.ts` | the two loops |
| `src/services/sync/local.ts` | unsync reads, child arrays, marker writes |
| `src/services/sync/stream.ts`, `transport.ts` | the Channel→stream polyfill, and the Rust commands as a service |
| `src/services/sync/live.ts` | the service: cursors, progress, service refreshes |
| `src/pages/Setting/Sync/` | Sinkronisasi (admin-only): server + token, then run |

Tests: `wire.test.ts` (canonical bytes and frames), `sync.test.ts` (merge/push SQL
against a real SQLite and a protocol-faithful fake server), `live.test.ts` (the whole
loop through `service.sync.run` against `test-backend.ts`, a mock backend that assigns
`sync_seq`, applies server-side LWW and verifies the offset/chain).

## Turning it on

Pengaturan → **Sinkronisasi** (admin only). Fill in the server address and the
`SYNC_TOKEN`, save, then press **Sinkronisasi** — the buttons stay disabled until both
are stored.

The first run after upgrading uploads the **whole** database: the sync server was created
from zero for this protocol and had never seen this device, so `migration-47` clears every
`_sync_at` marker. Expect it to take a while once, then only deltas after that.

Do not point two installs at one endpoint expecting a merge — see the last section.

## Rencana perbaikan (future improvements)

What ships today is v1: manual, rows-only, one device. Everything below is **not built
yet** — the order is the order we would take it, because each step makes the next one
cheaper. Nothing here changes the wire format: the contract was written so that all of it
is additive (backend contract §12).

### 1. Sinkronisasi otomatis (v2)

The single biggest gap: the operator has to remember to press a button.

*What exists* — `service.sync.run()` is already an Effect fiber with a progress stream and
a working cancel path, so a scheduler only has to decide *when* to start one. What is
missing is the policy, and a way to show that a run is happening from anywhere in the app
(see #3).

*Proposed policy*

| Trigger | Why |
|---|---|
| After a record commit, debounced ~30 s | the sale is the data that matters; batching keeps a busy till from syncing per receipt |
| On app start, once the cart is restored | catches a device that was closed for days |
| When `window` regains focus or the machine resumes | the cheap moment to notice the network is back |
| Safety net every ~15 min while idle | bounds how stale a device can be if a trigger is missed |
| Never while `transaction` has an uncommitted cart | a merge refreshes product refs; do not interleave with checkout |

*Failure policy* — retry transport failures with exponential backoff (5 s → 10 m) and jitter;
do **not** auto-retry `401`/`400` (a wrong token or address needs the operator, and retrying
only fills the log). Single-flight via the existing `running` ref, so a trigger during a run
is dropped rather than queued. Every automatic run must be visibly accounted for — an
invisible background write to the shop's data is worse than a stale mirror.

### 2. Sinkronisasi byte gambar (image blobs)

Rows already sync, so a restored device knows *which* picture belongs to which product and
record — it just cannot show it: the files live under `AppData/images/` and never travel.

*Needed* — the reserved `blob` frame (contract §9) plus `/v1/blob/:sha256` on R2 backing it;
an `image_sha` column on `images` and `record_images` (so a row names its content, not its
local filename); upload after the row that references it, download lazily on first paint
with a placeholder in the meantime. Content addressing gives dedupe for free — the same
photo used as a product cover and a receipt attachment is stored once — and makes transfer
resumable per blob instead of per stream. Also needs a GC pass, or an edited image leaves
its bytes behind forever.

### 3. Indikator status yang selalu terlihat

The Sinkronisasi screen is the only place a run is visible, which is fine while sync is
manual and wrong the moment it is automatic. The design already exists
(`<sync_ui_design>` in `specification.xml`): a compact pill in the `AuthLayout` — phase,
last success, and a retry affordance on failure. It subscribes to the same
`service.sync.progress` stream, so this is UI work only, plus a decision on where a failure
that happened while the operator was on the POS screen gets acknowledged.

### 4. Melanjutkan unggahan antar-jalankan (upload resume)

A run starts a fresh upload session, so a crash halfway through a first full push re-sends
everything. Nothing is lost (every frame is idempotent) but on a slow uplink that is hours
repeated.

*Needed* — one field: the `GET /v1/upload/:id` response must expose the session's
`prefix_sha`. The client already persists `sync.upload_chain`, so once the server publishes
the hash, `openSession` can verify `at` + `frames` + `prefix_sha` against its own record and
continue instead of deleting the session.

### 5. Token di tempat yang aman

`sync.token` currently sits in `store.json` as plain text. It is a single-tenant secret, but
it is still the whole shop's data in one string, and any process that can read the app
config directory can read it.

*Proposed* — a small Rust command pair over the OS credential store (Windows Credential
Manager via `windows`/`keyring`, Secret Service on Linux), keeping only the endpoint in
`store.json`. The UI does not change; `config.get` returns whether a token is stored, and
`config.set` writes it to the keychain. Also gives a sane "token missing, re-enter it" state
that does not wipe the cursors.

### 6. Menampilkan konflik yang dimenangkan server

Today a `stale` ack silently rewrites the local row — correct per contract, but invisible.
For a renamed product or a re-priced listing that is a real event in the shop.

*Proposed* — keep the payload of the last N stale merges (entity, id, changed columns, two
timestamps) and surface them on the Sinkronisasi screen as "3 data diperbarui dari server",
with the detail behind a disclosure. Zero protocol change: the client already receives the
winning row.

### 7. Lebih dari satu perangkat

The protocol was written for the general case (LWW, server tiebreak, `sync_seq` cursor) and
the pull cursor already refuses to jump past a second writer's rows. Three things are
unproven rather than missing: `stocks` is derived locally from the journal (each device
should reach the same lots, but that wants a test); `record_pair_id` may name a twin that
arrives later; and there is no stable device id for diagnostics.

*Needed* — a `X-Device-Id` header, a test that runs two in-memory mirrors against one
backend through `test-backend.ts`, and then the sanctioned `sync_change` log (contract §12)
if re-materialising pull snapshots ever becomes too expensive.

### 8. Sesi unggahan per-entitas

One session covers all fourteen entities, so an oversized entity blocks everything behind
it. Contract §12 sanctions splitting them if that ever bites; it costs a session per entity
and simpler failure isolation, and would only be worth doing after #4 (resume) is in place.

### 9. Pembersihan tombstone

Soft-deleted rows are never removed, on either side, so both databases grow monotonically
with deletions. A `_deleted_at` older than, say, 90 days and already synced could be purged —
but only under a protocol rule that also stops a late-joining device from resurrecting it
(the tombstone is the only thing preventing that).

### 10. Diagnostik

Errors reach the app log (Setting → Log) but there is no sync-specific view: no last-run
summary, no per-entity counts, no record of a `409 replay_mismatch` or a chain divergence.
A small diagnostics panel reading the same progress/report values would turn "it didn't
sync" into a one-line answer.

### 11. Sinkronisasi selektif / terbatas rentang

A shop with years of history must upload all of it before the mirror is complete, and a
restored device must download all of it to answer a question about today. A first-sync
window ("last 12 months, then catch up") needs server support in the pull, and a decision
about what a partial mirror means for reports.

### 12. Klien mobile

The protocol admits one by design (no user table, one token, LWW). It would want the image
blobs of #2, smaller pull pages, and a read-only stance that never pushes a `record` — a
phone should not become a second author of the sales history without an explicit decision.

# Windows installer

A `.msi` can only be produced on Windows. `tauri-bundler` gates the WiX-based MSI
packaging behind `#[cfg(target_os = "windows")]`, so on any other host it logs
`ignoring msi` and then fails with `No bundles were built`. A Linux machine can
build the NSIS installer instead (see below), never the MSI.

## From CI (recommended, and the only way to get an `.msi`)

`.github/workflows/windows-release.yml` runs on `windows-latest` and builds
`kassir_<version>_x64_en-US.msi` (see
[Windows installer docs](https://v2.tauri.app/distribute/windows-installer/)):

- **Automatically** on a push to `master` — attaches the installer to a **draft**
  release tagged `v<version from package.json>`. Pushes that only touch
  `.github/**` or markdown files are ignored, so tweaking CI does not try to
  rebuild an already-released version.
- **On demand** — *Actions → Publish Windows App → Run workflow*. The **ref
  dropdown picks the branch to build**, which is the normal way to get an
  installer for a branch that is not `master`:

```sh
gh workflow run windows-release.yml --ref prod                    # draft, tag v6.17.2
gh workflow run windows-release.yml --ref prod -f draft=false     # publish right away
gh workflow run windows-release.yml --ref prod -f tag=v6.17.2-test  # custom tag
```

The manual trigger has to live on the default branch for GitHub to show it,
which is why this file is on `master`; other branches are built by selecting them
as the ref. Keep `draft` on unless you mean to publish: `tauri-action` updates an
existing release with the same tag, so dispatching a version whose tag already
exists touches that release's assets unless you pass a custom `tag`.

## From this Linux machine (NSIS only)

Two things are needed first:

1. **Case-correct import paths.** Imports reference page folders in the wrong
   case (`./pages/shop` vs `Shop`, `~/pages/shop/store/product`,
   `./product/Detail`, `./pages/login`, …) and there is a case-duplicate
   `src/pages/record/index.tsx`. Windows resolves all of these because NTFS is
   case-insensitive; on Linux the build aborts with
   `Could not resolve "./pages/login" from "src/route.tsx"`. `dev` fixed this in
   `33264a2`; it is **not** applied to `prod`/`master`.
2. **A cross toolchain**: `clang`/`llvm` (for `clang-cl`, `llvm-rc`), `lld` (for
   `lld-link`), `nsis` (for `makensis`), plus
   `rustup target add x86_64-pc-windows-msvc` and
   `cargo install --locked cargo-xwin`.

Then:

```sh
sudo apt install clang llvm lld nsis

bunx tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc \
  --config '{"bundle":{"targets":["nsis"]}}'
```

Both flags matter: without a Windows `--target` the configured bundle targets are
filtered against the host OS, and `--bundles nsis` is rejected outright on Linux
(`possible values: deb, rpm, appimage`), so the target list has to come from
`--config`. `createUpdaterArtifacts: true` additionally requires
`TAURI_SIGNING_PRIVATE_KEY` (and `..._PASSWORD`); without it the build stops at
"A public key has been found, but no private key".

Output: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*-setup.exe`.

References: [Windows installer / cross-compilation](https://v2.tauri.app/distribute/windows-installer/),
[updater signing](https://v2.tauri.app/plugins/updater/),
[cargo-xwin](https://github.com/rust-cross/cargo-xwin).
