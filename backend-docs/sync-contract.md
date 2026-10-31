# Kassir Sync — Client Contract (kassir-desktop side)

**Version:** 1.0-draft · **Status:** agreed architecture, not yet implemented

The canonical protocol lives in `kassir-backend/docs/SYNC-CONTRACT.md`. This
file is the client-side mirror: what `kassir-desktop` MUST do, MUST store, and
MUST NOT assume. If the two files disagree, the backend file wins and this one
gets patched.

---

## 1. Role

The desktop app is the only sync participant. One device is authoritative for
local writes; the server is a durable mirror that also replays history. There
is no other client to merge against *today*, but the protocol is written for
the general case (LWW, server tiebreak) so a second device can be added
without a migration.

No sync implementation exists yet (see `specification.xml` →
`<sync_system status="not-implemented">`). This file is the contract the
future `src/services/sync/` implements.

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

Runs as one Effect fiber owned by a `sync` service (service-first rule: all
reads/writes go through the owning domain services, never page SQL). UI:
one `Sinkronisasi` action, per-entity progress, cancel on leaving the screen
(§ `<sync_ui_design>`).

### 5.1 Pull

```
loop:
  GET /v1/pull?since=<last_pulled_seq>&limit=1000
       Accept-Encoding: gzip
  for each line:
    row frame  → merge per §6
    ag frame   → record aggregate merge per §6
    done.s     → last_pulled_seq = done.s ; persist cursor
  until meta.snapshot_seq <= last merged seq
```

Resume after disconnect: re-issue the same `since` (rows are idempotent to
merge). Byte-offset resume (`Download-Offset` + `Download-Prefix-Sha256`,
backend §8.2) is an **optimization** the client may skip entirely — on
`409 snapshot_moved`, fall back to `since = last merged seq`, offset 0.

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
- Any UI beyond the designed `Sinkronisasi` screen — this file does not
  specify UI; see `<sync_ui_design>` in `specification.xml`.
