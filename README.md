# Kassir

Aplikasi untuk kasir.

![beranda](./docs/static/img/shop.png)

# TODO

- tambah extra baru harusnya revalidate cache
- add indexing on product-events for performance

# Sinkronisasi

**Sync v2, group `money`** — `pockets` and `money`, nothing else. Contract:
`SYNC-V2-MONEY.md`. It is **started manually**: the operator presses a button; there is
no timer and no sync-on-launch. The run itself is a background task: it belongs to the
sync service, not to the screen, so leaving Pengaturan → Sinkronisasi keeps it going, a
small status pill in the bottom-left corner follows it on every screen, and only an
explicit cancel stops it.

The transport lives in Rust, not the webview: the window CSP is
`connect-src 'self' ipc:`, so a `fetch` to the sync host is blocked before it leaves, and
the WebView cannot read a streamed NDJSON body under `ipc:`.
`src-tauri/src/sync.rs` owns the socket and pushes NDJSON lines to JS one per Tauri
`Channel` message; `src/services/sync/stream.ts` turns that back into the reader the rest
of the code is written against.

## The two endpoints

| Direction | Call | What comes back |
|---|---|---|
| pull | `GET /v2/money/pull/:seq?limit=1000` | `meta` → `row`/`del` … → `done` |
| push | `POST /v2/money/push` (NDJSON body, ≤1000 frames, pockets first) | `ack` per frame → `done` |

There is **no session, no upload id, no byte offset and no hash chain** in v2. Each
request stands alone, every frame — in both directions — is idempotent, and the only
client state is one integer per group.

## Groups, and one progress bar each

The protocol is grouped by tables, and each group is an **independent stream**: its own endpoint pair, its own
column dictionaries, its own bookmark (`sync.<group>.bookmark`). Today exactly one group ships — `money`, covering
`pockets` and `money`. The screen renders one progress bar per group (`GroupState` per group in `SYNC_GROUPS`
order), so a second group becomes another bar, not another redesign: it needs a new `syncGroup` case plus its own
bookmark key, and the money flow stays untouched.

A group's bar spans its **whole cycle**, not one phase: `pull`, `merge`, `push` and the closing pull are weighted
into a single fraction (60 / — / 30 / 10) and clamped upward, so it fills once instead of emptying at every phase
boundary. The pull's fraction is real, not a spinner — `done.s` against the first `meta.snapshot`. The caption
still names the phase ("Mengunduh…", "Mengunggah…"), and only before the first page lands is the bar an
indeterminate sliver.

## One run, four stages (per group)

1. **Unduh (pull)** — one page per request. Lines are decoded as they arrive and held
   for the merge of *that page* only.
2. **Simpan (merge)** — the page is applied as **one transaction** through the
   `sync_merge` command. `tauri-plugin-sql` has no transaction handle (its `execute`
   runs a multi-statement string in autocommit), so that command borrows the plugin's
   own pool — it publishes `DbInstances` and `DbPool::Sqlite` — and runs
   `BEGIN … COMMIT` on one connection. The bookmark is written **after** the commit, so
   a crash re-pulls the same page; every write is idempotent, so that is harmless.
3. **Unggah (push)** — the rows whose `*_sync_at IS NULL`, pockets before money, ≤1000
   frames per batch. One ack per frame: `applied`/`noop` set `*_sync_at = seq`;
   `stale` carries the server's winning row, which is merged immediately.
4. **Unduh lagi** — picks up whatever another till wrote while this one was pushing.
   Usually one empty page.

## The merge rule

One rule per entity, applied in three places (client pull, server apply, client
`stale` ack), so both sides always agree:

- **`pockets`** — full last-writer-wins on `pocket_updated_at`; a tie keeps the stored copy.
- **`money`** — insert, note edit and soft delete only. `timestamp`, `money_value` and
  `pocket_id` are **immutable**: an amount that has been recorded is a fact, so a later
  push can never rewrite the ledger. A copy that disagrees on any of the three loses and
  is repaired from the server's row.

Deletes are `*_deleted_at` tombstones and travel as ordinary rows. A row whose pocket is
not on this device yet is **parked** (never dropped, never allowed to abort the page) and
retried against every later page.

## What syncs

`pocket` and `money`. Everything else in this app is local for now; adding another table
means adding a group with its own bookmark and the same shape, not widening this one.

## Cursors

In `store.json`:

- `sync.money.bookmark` — one integer for the whole group: the highest `seq` durably stored.
- `sync.money.parked` — money rows waiting for their pocket.
- `sync.token`, `sync.device_id`.

`Sinkronisasi Ulang` clears the bookmark, drops the park and marks **every** pocket and
money row unsynced before running the same cycle — the remedy when the device and the
server disagree, and the way a database written before v2 gets its rows uploaded.

## Where it lives

| Path | Role |
|---|---|
| `src-tauri/src/sync.rs` | HTTP + NDJSON stream transport, cancellation |
| `src-tauri/src/sync_merge.rs` | the merge as one real SQLite transaction |
| `src/services/sync/schema.ts` | the two column dictionaries (the wire contract) |
| `src/services/sync/frames.ts` | NDJSON frame encode/decode |
| `src/services/sync/sql.ts` | guarded upserts, markers, the unsync reads |
| `src/services/sync/merge.ts` | the merge rule, the page apply, the park |
| `src/services/sync/pull.ts`, `push.ts` | the two loops |
| `src/services/sync/stream.ts`, `transport.ts` | the Channel→stream polyfill, and the Rust commands as a service |
| `src/services/sync/live.ts` | the service: bookmark, park, progress, service refresh |
| `src/pages/Setting/Sync/` | Sinkronisasi (admin-only): server address + token with a health check, then run |

Tests: `src/services/sync/sync.test.ts` — the merge rule, plus whole cycles against a
real SQLite and a protocol-faithful fake server (second device, note edit vs amount edit,
duplicate push, parked money, refused bookmark).

## Turning it on

Pengaturan → **Sinkronisasi** (admin only). The server address is a setting, seeded with
`SYNC_DEFAULT_BASE_URL` (`https://api.kassir.store`) — change it for a self-hosted or
staging backend; fill in the sync token, press **Cek** to ping that address's
`/v2/health` and see the answer inline, then save and press **Sinkronisasi** — the
buttons stay disabled until both fields are stored.

Rows written before v2 existed have no server-side counterpart, so the first run after
this upgrade will not upload them by itself: press **Sinkronisasi Ulang** once, which
queues every pocket and money row.
