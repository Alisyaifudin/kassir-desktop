# Kassir Sync — Client Contract (kassir-desktop side)

**Version:** 1.1 · **Status:** implemented in `src/services/sync/` (v1 behaviour)

The canonical protocol lives in `kassir-backend/docs/SYNC-CONTRACT.md`. This
file is the client-side mirror: what `kassir-desktop` MUST do, MUST store, and
MUST NOT assume. If the two files disagree, the backend file wins and this one
gets patched. Where a section describes *how* this client meets the protocol
rather than what the wire requires, it says so.

---

## 1. Role

The desktop app is the only sync participant. One device is authoritative for
local writes; the server is a durable mirror that also replays history. There
is no other client to merge against *today*, but the protocol is written for
the general case (LWW, server tiebreak) so a second device can be added
without a migration.

The implementation is `src/services/sync/` (see `specification.xml` →
`<sync_system>`); `specification.xml` → `<sync_ui_design>` describes the screens.

## 2. Sync set

Exactly the entities in backend contract §2.1, in the fixed order:

```
pocket → money → product → product_name → property → listing → image
→ customer → supplier → extra → method → social → product_event → record
```

Never synced (do not build reads for them): `cashiers`, `stocks`, all `tx_*`,
enum tables, `versions`, `graves*`, `<name>_old` residue. Image **bytes**
(`AppData/images/`) do not sync in v1 — rows only; a restored device shows
placeholders.

## 2.1 Credentials

The client authenticates with a **per-device sync token** minted by the admin
API (`POST /v1/admin/tokens`, guarded by the admin password):

```
Authorization: Bearer kst_<43 base64url chars>
```

- Store it in the app's config (Tauri store `sync.token`), never in the repo or
  logs. It is shown exactly once at creation — the server keeps only its digest.
- There is no refresh flow: a token is valid until an operator deletes it.
  `401` means "this token is gone" → the app should stop syncing and prompt for
  a new one rather than retrying.
- One token per install is the intended model: revoking a lost laptop does not
  disturb the phone.
- `GET /v1/health` accepts either the sync token or the admin password; the app
  uses the sync token like every other call.

## 3. Client-side bookkeeping

### 3.1 Columns already in the schema

- `<x>_updated_at` — merge clock, epoch ms, set on every local write.
- `<x>_sync_at` — set when the server acks the row `applied`; cleared on any
  local change. `NULL`/stale ⇒ the row belongs in the unsync set.
- `<x>_deleted_at` — soft delete; tombstones sync like any other update.

### 3.2 Cursors (persisted via the store service, not SQL)

| key | meaning |
|---|---|
| `sync.last_pulled_seq` | highest `sync_seq` merged from a pull |
| `sync.upload_id` | open upload session id (may be absent) |
| `sync.upload_offset` | committed bytes of that session (server is truth) |
| `sync.upload_frames` | committed frame count (next frame index) |

`Sinkronisasi Ulang` (full resync) resets `last_pulled_seq` to `0`, deletes
the upload session (`DELETE /v1/upload/:id`), marks every syncable row
unsynced, and runs the normal flow.

## 4. Wire duties

### 4.1 Canonical JSON

Every emitted row must be byte-reproducible: columns in the exact order of
backend contract §3, every column present (explicit `null`), integers as
integers, reals in shortest round-trip form (`JSON.stringify` on a `number`
already does this). Freeze the column order in one schema constant shared by
the encoder and the merge decoders — never `Object.keys` order.

### 4.2 Hash chain (client computes while writing)

```
C_0 = ""
C_n = hex( sha256( hex2bytes(C_{n-1}) || "\n" || line_bytes ) )
```

`line_bytes` excludes the terminating `\n`. Maintain `(offset, frames, C)`
in memory while streaming; after each committed chunk the server's pointer
(`done.at`) and the in-memory values must agree — they are the resume state.
No local manifest table is needed (the earlier "client frame manifest" option
was rejected; the server pointer + chain hash is the whole state).

### 4.3 Compression

Client MAY `pipeThrough(new CompressionStream("gzip"))` on upload bodies with
`Content-Encoding: gzip`. On download, send `Accept-Encoding: gzip` and
decompress **only if the response still carries `Content-Encoding: gzip`** — a
normal HTTP stack (Bun `fetch`, Rust `reqwest`) decompresses transparently and
strips the header, so checking the header is the unambiguous rule. All
offsets/hashes are computed **before** compression on upload and **after**
decompression on download (backend contract §4.4).

## 5. The sync loop (pull → merge → push)

Runs in a `sync` service as a **background task**, not as a screen's promise. A
run outlives whatever started it: closing the status dialog, navigating away,
even logging out does not stop it (the pill goes with the authenticated shell,
the run does not), and only an explicit cancel does. That is a requirement, not a
convenience — a run that dies on unmount silently drops the gap it was merging,
and a run whose failure disappears with the screen is a failure nobody reports.

One run at a time. A second request while a run is in flight is refused rather
than started: two loops would pull the same gap and fight over one upload
session, and the cursors only have one writer.

Cancelling is cooperative: the interrupt is delivered at the run's next async
boundary, so an in-flight merge transaction or upload chunk settles first. The
run's state says `cancelling` for however long that takes — a state that said
`cancelled` while a transaction was still committing would be a lie.

### 5.1 Pull

```
loop:
  GET /v1/pull?since=<last_pulled_seq>&limit=1000
       Accept-Encoding: gzip
  for each line:
    row frame  → hold for the merge (§5.2)
    ag frame   → hold for the merge (§5.2)
    done.s     → the next `since` (not the cursor — see below)
  until meta.snapshot_seq <= the last seq received
```

Resume after disconnect: re-issue the same `since` (rows are idempotent to
merge). Byte-offset resume (`Download-Offset` + `Download-Prefix-Sha256`,
backend §8.2) is an **optimization** the client may skip entirely — on
`409 snapshot_moved`, fall back to `since = last merged seq`, offset 0.

**`last_pulled_seq` is persisted after the merge, not after each page.** The
gap is merged first and the cursor moves only once that merge has been applied
(§5.5), so a crash between two pages re-pulls the same range and re-merges it
into the same result, instead of advancing past rows that were never written.
The cursor is a claim about the local mirror, so it can only move after the
mirror has the rows.

### 5.2 Merge rules (client)

- Row: apply iff `incoming.updated_at > local.updated_at`; on tie the server
  already kept its own copy, and the server row reaches the client only via a
  `stale` ack (never as a pull row) — merge that payload unconditionally.
- Tombstones merge like updates.
- Record aggregate: if the header wins LWW, replace **all five child arrays**
  in one transaction; if it loses, touch nothing and apply the `stale`
  aggregate from the ack instead.
- `product_event`: `INSERT OR IGNORE` by id; never update, never delete.
- After merging, set the row's `_sync_at` (it came from the server; do not
  re-push it).
- Dangling references are legal (events may precede records; snapshots may
  point at rows the server doesn't FK-check) — reads must already tolerate
  this; keep it that way.

Known limit of this client: the deferred pointer writes are the one statement in
a merge that is not clock-guarded — `UPDATE … SET <ptr> = <id> WHERE … AND <ptr>
IS NULL`. `IS NULL` is read as "this row has no opinion", so a pointer the
server's frame carries is filled in even when the local row is newer. It only
writes a hole that was empty, which is why it is left alone rather than
branched on.

**Both decisions are made inside the transaction, in SQL.** A run is a
background task, so the operator is working while it writes: a clock read in
the client and compared before the batch would be a decision about a row that
may have changed by the time the statements run. Concretely:

- the header upsert carries its own comparison (`WHERE excluded.updated_at >
  <table>.updated_at`, or `= <uploaded clock>` for a forced payload), evaluated
  at statement time;
- the child rewrites of a `record` carry *"the header in the table is the one
  this plan just wrote"* — its `_sync_at` is this batch's stamp and its
  `updated_at` is the incoming clock, a pair no other writer produces. Without
  it, a local edit that landed after the plan would lose its children even
  though its header correctly survived.
- a `stale` payload applies only if the local row still carries the
  `updated_at` this device uploaded. If the row moved, the payload is dropped,
  the row stays unsynced, and the next push compares the two properly:
  applying it would overwrite the edit **and** move `updated_at` past the
  marker guard that would have re-pushed it, losing the edit in both
  directions.

### 5.3 Push

```
if no session:  POST /v1/upload        → store upload_id
resume check:   GET /v1/upload/:id     → at, frames (server is truth)

loop over entities in §2 order:
  read the service's unsync set (rows where _sync_at is null/stale)
  encode frames (row frames; record = one aggregate frame)
  PATCH /v1/upload/:id
      Upload-Offset: <committed bytes>
      Upload-Prefix-Sha256: <chain hash at that offset>
      Content-Type: application/x-ndjson
      (optionally gzipped, §4.3)
      body: the next chunk of frames
  consume ack stream:
    applied → set _sync_at on that row
    stale   → merge server row/aggregate, set _sync_at
    noop    → set _sync_at (event already known)
    done.at → pointer = done.at; frames = done.frames
    done.chain → adopt it as your chain (the server is the source of truth)
  repeat until the unsync sets are empty
```

**Streaming across calls, not within one.** A single PATCH need not carry the
whole upload: the webview's `fetch` has no reliable duplex streaming, and
`plugin-http` (reqwest) doesn't guarantee a streaming request body either.
The protocol is already chunked — each PATCH appends one chunk to the session
with `Upload-Offset` continuity. Plain sequential PATCH calls satisfy the
contract. In-memory streams are welcome when the transport allows them.

### 5.4 Failure handling

| situation | action |
|---|---|
| disconnect mid-PATCH | `GET /v1/upload/:id`, resume from `at`/`frames`; re-encode frames from `frames` onward |
| `409 replay_mismatch` | local regeneration diverged → `DELETE` session, new session, re-push full unsync set (idempotent) |
| session expired / 404 | same as above |
| `409 offset_conflict` | re-read pointer, retry the chunk |
| `413 payload_too_large` | a single frame exceeded 1 MB — log it; v1 has no legal frame that big (investigate if hit) |
| in-stream `error` frame | treat as transport failure; resume per above |

The server pointer is the only truth about progress; nothing is lost by
dropping in-memory state.

### 5.5 Applying a pull: sliced, not one transaction

How this client meets §5.2 (the wire does not care, the till does).

The plan for a pull is built for the whole gap at once — that is what lets a
reference be resolved against `local ∪ incoming` instead of "try again later" —
but it is applied in **bounded slices** (≈200 statements), one transaction
each, and an aggregate's header never travels in a different slice from its
five child arrays: half an aggregate is a record with the wrong lines.

The reason is contention, not correctness. A first sync can be tens of
thousands of statements; one transaction that long holds SQLite's writer lock
while the shop is selling. The cart flushes on a 100 ms debounce, so the POS's
own write queues behind it and then fails with `SQLITE_BUSY` once the driver's
busy timeout runs out — a failed sale caused by a sync nobody started.

Slicing gives up "all or nothing", and that is safe because:

- every statement is idempotent (LWW upserts, `INSERT OR IGNORE` events, a
  guarded aggregate replacement);
- merged rows are marked `_sync_at`, so nothing is pushed back;
- the cursor only moves after the last slice, so a crash mid-merge re-pulls the
  same gap and re-merges it into the same result;
- between slices the mirror is half-merged, and every reader already tolerates
  that (dangling references are legal).

The database is also opened in WAL mode, once per file and best effort: readers
then never block writers and are never blocked by them, so only writers queue —
and the slices are what keep those short. In rollback-journal mode a writer
blocks readers at the commit, and this app reads constantly.

## 6. Local schema impact

None. The current schema (migration 43/44) already carries everything the
protocol needs: sync trios, soft deletes, ULID text PKs, `product_events`
append-only journal, aggregate-shaped records. The `migration-44` step-13
comment (`record_sync_at = NULL` re-push forcing) is expected to be enabled
when the sync service ships, so existing data pushes in the new shape.

## 7. Out of scope in v1

- Image bytes (reserved `blob` frame / R2 endpoints, backend §9).
- Per-entity sessions, `sync_change` log pull (backend §12 upgrades).
- Mobile clients (the protocol is designed to admit one later).
- Automatic or scheduled sync. The run is a background task (§5), but nothing
  starts it except the operator: no timer, no sync-on-launch, no push-per-sale.
  The service's single-flight `start` is the seam a future trigger would use.
- Any UI beyond the designed screens — this file does not specify UI; see
  `<sync_ui_design>` in `specification.xml`.
