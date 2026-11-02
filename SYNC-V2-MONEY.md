# Kassir Sync v2 — money & pocket · end-to-end contract

**Protocol:** 2 · **Group:** `money` (covers `pockets` + `money`)
**Written for:** whoever implements the next piece — the server side, the desktop
client, or an agent picking this up with no prior context.
**Date:** 2026-11-01

This document is self-contained. Everything needed to implement, debug or extend
the money-group sync is here: the data on both sides, the wire format, both
endpoints, both algorithms, the failure modes, the code that exists today, and
the code that does not.

---

## 0. How to read this

| if you are… | read |
| --- | --- |
| the desktop client developer | §1–§12 (the behaviour), then §16 (checklist) |
| the server developer / next agent | all of it; §14 says what already works, §15 what the implementation must guarantee, §17 what is still open |
| debugging a live device | §6.5 (resume), §7.5 (retries), §13 (guarantees), §17.2 (error codes) |

This document specifies **behaviour, not implementation.** It says what the two
sides must do and what must be true afterwards; it deliberately does not say how
to build it, because several implementations are valid and one implementation
written into a contract is a contract nobody can improve.

Sections marked **⚠ NOT IMPLEMENTED** describe agreed behaviour that does not
exist yet. Do not assume those work.

---

## 1. What this is

The backend mirrors the desktop's transactional tables. The desktop is the
source of truth for its own data; the server is a durable meeting point so that
several tills in one shop converge.

Two directions:

```
pull   client asks "what changed after seq N"      → server streams changes
push   client sends rows that changed locally      → server applies + acks
```

Scope of this document: the **money group** — `pockets` and `money` only. Other
tables (products, records, …) will each become their own group with the same
shape and their own bookmark.

Two properties everything else is derived from:

1. **The server stamps a number on every change.** That number (`seq`) only ever
   increases. It is the only thing a client may use to say "I have up to here".
2. **The server keeps the history of changes**, not just current rows. That is
   what lets a client that was interrupted continue where it stopped instead of
   starting over.

---

## 2. The mental model

### 2.1 The problem that shapes everything

If the server only stores the current version of each row, a pull is not
reproducible. Row `m_01` is at seq 5 when a pull starts; it is edited and moves
to seq 9 while the bytes are still going out. A client that was cut off at byte
300 now asks for "the same thing again" and gets a different stream — every byte
after the edit shifted. That is unfixable without either buffering the whole
response in memory or keeping history.

A change log keeps history:

```
seq  entity  row_id  payload
 1   pocket  p_01    {"pocket_id":"p_01",…}
 2   money   m_01    {"money_id":"m_01","money_value":5000,…}
 3   money   m_01    {"money_id":"m_01","money_value":4000,…}   ← an edit, a NEW entry
```

Replaying `seq 1..2` returns the same bytes today that it returned yesterday.
That single property is what makes the rest of this design simple: no tickets,
no byte offsets, no hash chains, no in-memory buffers.

### 2.2 The two numbers

| number | lives where | means |
| --- | --- | --- |
| **`seq`** | server | the order of changes. Assigned when a change is applied. Never reused, never reordered |
| **bookmark** | client | the highest `seq` the client has **durably stored** |

There is no third number. In particular there is **no clock anywhere in the
protocol**: no `updated_at` decides what a client has already seen. `*_updated_at`
exists only to settle who wins when the same row arrives twice (§8).

---

## 3. Data model

### 3.1 What the server must be able to do

The contract needs only three capabilities from the server, however it chooses
to store them:

1. **A monotonic counter.** Every change that is actually applied gets the next
   value; nothing is ever reused, skipped backwards or reordered.
2. **A history.** Every applied change is readable later in seq order, with the
   row as it was at that moment, for an arbitrary `(bookmark, snapshot]` range.
3. **Current rows.** The latest state of each row, so a push can decide
   applied/noop/stale (§8).

Three behaviours are consequences the client may rely on:

- **No foreign key between `money.pocket_id` and `pockets`.** A money row may be
  stored for a pocket that does not exist (yet, or any more). §10 says how the
  client copes.
- **The server's own bookkeeping columns are never transmitted.** Rows on the
  wire carry exactly the columns in §3.3 — nothing else, and nothing that only
  exists on the server.
- **The history is not the current row.** A row that changes twice appears twice
  in the history and once in the current state.

### 3.2 Client tables (the desktop, as they exist today)

```sql
CREATE TABLE pockets (
  pocket_id         TEXT PRIMARY KEY,
  pocket_name       TEXT NOT NULL,
  pocket_type       TEXT NOT NULL DEFAULT 'absolute',   -- REFERENCES pocket_enum(v)
  pocket_ordering   INTEGER NOT NULL,
  pocket_updated_at INTEGER NOT NULL,
  pocket_sync_at    INTEGER,                            -- client-only dirty flag
  pocket_deleted_at INTEGER
) STRICT;

CREATE TABLE money (
  money_id         TEXT PRIMARY KEY,
  timestamp        INTEGER NOT NULL,
  money_value      REAL NOT NULL,
  pocket_id        TEXT NOT NULL REFERENCES pockets (pocket_id) ON DELETE CASCADE,
  money_note       TEXT NOT NULL DEFAULT '',
  money_updated_at INTEGER NOT NULL,
  money_sync_at    INTEGER,                             -- client-only dirty flag
  money_deleted_at INTEGER
) STRICT;
```

Three client-only facts:

- **`*_sync_at` never appears on the wire.** It is the client's own bookkeeping:
  `NULL` means "this row still needs to be pushed". The server has no such
  column and ignores it if it is present in a pushed row.
- **`ON DELETE CASCADE` on `money.pocket_id`** means hard-deleting a pocket row
  silently destroys its money rows on that device. Never hard-delete a pocket
  (§9).
- **The foreign key is enforced.** The client's SQLite connection runs with
  foreign keys on, so a money row whose pocket is absent cannot be inserted.
  §10.1 says what to do about that.
- The server's own bookkeeping never crosses the wire: a pulled row carries
  exactly the columns of §3.3. The client derives nothing from `seq` except its
  bookmark.

Two paths in the desktop's current code contradict this document — see the
checklist in §16 for what to change, and §9.2 for the consequence of getting the
first one wrong.

### 3.3 Column dictionaries (the canonical order)

The server serialises a row with exactly these keys, in this order. A client
does **not** have to produce this order (§4.2), but this is what it will receive.

```
pocket (6)   pocket_id, pocket_name, pocket_type, pocket_ordering,
             pocket_updated_at, pocket_deleted_at

money  (7)   money_id, timestamp, money_value, pocket_id,
             money_note, money_updated_at, money_deleted_at
```

`*_sync_at` is **not** in these lists: it never crosses the wire.

---

## 4. Wire format

### 4.1 NDJSON

Every request body and every response body is newline-delimited JSON:

- one JSON **object** per line
- UTF-8, terminated by exactly one `\n` (0x0A); no `\r`
- a line never contains a raw newline (JSON escaping covers it)
- the response is **streamed**: lines arrive progressively, there is no
  `Content-Length`

### 4.2 JSON values and types

- integers are integers (`5000`), reals are reals (`5000.5`) — never quoted
- `null` is explicit for nullable columns
- timestamps are epoch **milliseconds**, integers
- every row carries every column of its dictionary (§3.3); no column omitted

**Key order does not matter for correctness.** v1 hashed the bytes, so both
sides had to emit byte-identical JSON. v2 has no hashing and no byte-offset
resume, so the server parses the JSON and re-serialises canonically. A client
may send its objects in any key order, and may include its own extra columns
(they are ignored).

### 4.3 Every line starts with `t`

| `t` | direction | purpose |
| --- | --- | --- |
| `meta` | server → client | first line of a pull response |
| `row` | server → client | one change whose row exists |
| `del` | server → client | one change whose row is gone (reserved, §9.3) |
| `ack` | server → client | one frame of a push, per row |
| `done` | server → client | last line of any response |
| *(none)* | client → server | push bodies are bare row frames: `{"e":…,"r":…}` |

### 4.4 Compression

Both directions are optional and negotiated per request:

| direction | how |
| --- | --- |
| pull | client sends `Accept-Encoding: gzip`; the server **may** answer `Content-Encoding: gzip`. Identity is always valid. The client must check the header before decompressing |
| push | client may send `Content-Encoding: gzip` on the request body. Only `identity` and `gzip` are accepted; anything else is `415` |

The server suppresses response compression when `DEV=true` (local development),
so a local server always answers identity.

### 4.5 Error bodies

A non-`2xx` response is a JSON object, not NDJSON:

```json
{"error":{"code":"bad_frame","message":"frame 3: unknown entity \"monies\"","index":3}}
```

| field | meaning |
| --- | --- |
| `code` | stable, machine-readable — branch on this |
| `message` | human text — never parse it |
| `index` | only for `bad_frame` during a push: the 0-based line number in the request body |

Full table: §18.2.

---

## 5. Authentication

Both endpoints require a **sync token**:

```http
Authorization: Bearer kst_<43 base64url chars>
```

- Tokens are created and revoked by an operator: `POST /v1/admin/tokens`, `DELETE /v1/admin/tokens/:id`.
- Only the SHA-256 digest is stored server-side; the raw token is shown once.
- Missing, unknown or revoked → `401 unauthorized`. Do not retry in a loop.
- The admin password is **not** accepted here.

---

## 6. Pull

### 6.1 Request

```http
GET /v2/money/pull/:seq?limit=5000
Authorization: Bearer kst_…
Accept-Encoding: gzip
```

| parameter | required | meaning |
| --- | --- | --- |
| `:seq` | yes | the client's bookmark: the highest `seq` it has **durably stored**. `0` on first sync |
| `limit` | no | maximum changes in this response. Default `5000`; below `1` falls back to the default; above `20000` is capped |

The client never sends a snapshot. Only the response carries one.

### 6.2 Response

`200`, `Content-Type: application/x-ndjson`, `Cache-Control: no-store`, streamed.

```jsonl
{"t":"meta","snapshot":41}
{"t":"row","s":38,"e":"pocket","r":{"pocket_id":"p_01","pocket_name":"Cash","pocket_type":"absolute","pocket_ordering":1,"pocket_updated_at":1762000000000,"pocket_deleted_at":null}}
{"t":"row","s":39,"e":"money","r":{"money_id":"m_01","timestamp":1762000000000,"money_value":5000,"pocket_id":"p_01","money_note":"","money_updated_at":1762000000000,"money_deleted_at":null}}
{"t":"done","s":39,"more":false}
```

| line | fields | meaning |
| --- | --- | --- |
| `meta` | `snapshot` | highest `seq` that existed when the response started. Always first |
| `row` | `s`, `e`, `r` | `s` = seq of this change, `e` = `"pocket"` or `"money"`, `r` = the row |
| `del` | `s`, `e`, `id` | row no longer exists; delete locally. **Reserved — nothing produces this today** (§9.3) |
| `done` | `s`, `more` | `s` = highest seq **actually sent** → the new bookmark. `more` = more changes exist above it. Always last |

Guarantees:

- lines arrive in **strictly increasing `s`**
- the response contains every change in `(bookmark, snapshot]`, or it stops at
  `done.s < snapshot` and says `more: true`
- **the same row may appear more than once** — once per change. Apply in order.
- a soft-deleted row is an ordinary `row` with `*_deleted_at` set
- requesting the same bookmark twice returns **identical bytes** for the same
  entries, so re-asking is never harmful

### 6.3 What the response must contain

1. reject a `:seq` that is not a non-negative integer, or that is greater than
   the highest seq that exists → `400`
2. fix a **snapshot** = the highest seq that exists, read once, before reading
   any entry
3. emit the `meta` line
4. emit every change whose seq is in `(bookmark, snapshot]`, in increasing seq
   order, but no more than `limit` of them
5. emit the `done` line

The snapshot is taken once so the page cannot grow while it is being written:
anything applied during the response gets a higher seq and arrives on the next
call. That is also why a client may safely resume from `done.s`.

Paging is a **round-trip** trade-off, not a memory trade-off (the server emits
lines as it goes). Measured on the reference box: ~1–2 ms locally, **~230 ms
through the Cloudflare Tunnel**. For a 200k-row first sync: 5,000/page = 40
requests ≈ 9 s of pure waiting; 20,000/page = 10 requests ≈ 2 s. Incremental
syncs are one page regardless.

### 6.4 Client algorithm

```
after = <bookmark persisted last time, or 0>

loop:
    response = GET /v2/money/pull/{after}?limit=5000

    if response is 401 → stop, surface "device not authorised"
    if response is 400 → the bookmark is ahead of the server:
                         after = 0; discard SYNCED local rows (not the unsynced ones); continue
    if response is 410 → the bookmark is older than the server keeps:
                         after = 0; discard SYNCED local rows (not the unsynced ones); continue
    if response is 5xx → retry with backoff

    buffer = []
    for each line as it arrives:
        meta → remember snapshot (progress display only)
        row  → merge into buffer via LWW (§8)
        del  → mark that id for local deletion
        done → last

    BEGIN LOCAL TRANSACTION
        write buffered rows (and deletions)
        set bookmark = done.s
    COMMIT

    if not done.more: break
```

Rules that are not optional:

- **Streaming**: merge as lines arrive; do not accumulate the whole page before
  doing anything. A page can be 5,000 rows.
- **One transaction per page**, not per row. Thousands of single-row commits is
  slow and buys nothing.
- **The bookmark moves only with committed data**, and only up to `done.s`. A
  bookmark ahead of the data is unrecoverable: those rows will never be asked
  for again.
- `done.s` is the bookmark, **not** `meta.snapshot`. A page can stop early
  (`more: true`); storing the snapshot would skip everything after `done.s`.

### 6.5 Resume after a dropped connection

There is nothing to resume: ask again from the bookmark.

```
client at after=37
  → receives 38, 39, 40 … connection dies mid-stream
  → its transaction never committed, so after is still 37
client asks /v2/money/pull/37 again
  → server sends 38, 39, 40, 41, …    (a little overlap, harmless)
```

If the client had committed up to 40 before dying, it asks with 40 and gets 41
onward. Either way the answer is correct, because applying a change twice is a
no-op (§8).

### 6.6 Pull errors

| HTTP | code | when | client action |
| --- | --- | --- | --- |
| `400` | `bad_request` | `:seq` not a non-negative integer, **or** `:seq` greater than the server's counter | the bookmark did not come from this server: reset to `0`, full resync |
| `401` | `unauthorized` | missing/unknown/revoked token | stop |
| `410` | `too_old` | ⚠ NOT IMPLEMENTED. Bookmark older than retained history | reset to `0`, full resync |
| `500` | `internal` | server fault | retry with backoff |

---

## 7. Push

**Implemented** in `src/v2/money-push.ts` (apply) and `src/routes/v2-money.ts`
(the endpoint). Everything below is the agreed specification; §15 lists what the
implementation guarantees and §15.4 the outcomes it is tested against.

### 7.1 Request

```http
POST /v2/money/push
Authorization: Bearer kst_…
Content-Type: application/x-ndjson
Content-Encoding: gzip            (optional)

{"e":"pocket","r":{"pocket_id":"p_01","pocket_name":"Cash","pocket_type":"absolute","pocket_ordering":1,"pocket_updated_at":1762000000000,"pocket_deleted_at":null}}
{"e":"money","r":{"money_id":"m_01","timestamp":1762000000000,"money_value":5000,"pocket_id":"p_01","money_note":"","money_updated_at":1762000000000,"money_deleted_at":null}}
```

| rule | detail |
| --- | --- |
| body | row frames only: `{"e":"pocket"\|"money","r":{…}}`, one per line |
| what to send | the rows whose `*_sync_at` is `NULL` — the ones this device has changed and no other device knows about. Sending the `*_sync_at` key along is allowed and ignored |
| order | **every pocket before any money that references it** |
| batch size | ≤ **1000 frames** and ≤ **1 MB** uncompressed body, whichever comes first; over that → `413` |
| `Content-Type` | `application/x-ndjson` required; anything else → `415` |
| empty body | `200` with `{"t":"done","frames":0}` |
| duplicates | at most one frame per row id; two frames for the same id are both acked and the later one wins (§8) — legal, but always a client bug |
| state | none. No session, no upload id, no offset, no hash. Each request stands alone |

### 7.2 What the server decides, per frame

The whole batch is applied atomically: either every frame in it is applied, or —
if the request fails for any reason — none of it is.

Frames are considered in the order they were sent, and for each one the server
compares it with the row it already holds (if any). The decision is **per
entity**, because `money` and `pockets` do not permit the same edits (§8.1):

**`money` — insert, note, soft delete; never re-price**

| situation | ack |
| --- | --- |
| no such `money_id` yet | `applied` |
| `timestamp`, `money_value` or `pocket_id` differ from the stored row | `stale` |
| the rows are identical (the timestamp included) | `noop` |
| otherwise, `money_updated_at` is **greater** than the stored one | `applied` (the note and `money_deleted_at` are taken) |
| otherwise | `stale` |

**`pockets` — ordinary last-writer-wins**

| situation | ack |
| --- | --- |
| no such `pocket_id` yet | `applied` |
| the rows are identical (the timestamp included) | `noop` |
| otherwise, `pocket_updated_at` is **greater** than the stored one | `applied` (all columns are taken) |
| otherwise | `stale` |

For every `applied` frame the server records **one** change for other clients to
pull, carrying the row **as it is now stored** — for `money` that is the server's
immutable columns plus the accepted note, never the client's version of them.

For every `noop` or `stale` frame nothing is recorded: there is no change to
publish, and no seq is spent.

Why `money` is not plain last-writer-wins: an amount that has been recorded is a
fact. Letting a later push overwrite `money_value` would let a buggy or skewed
device rewrite the ledger. The note is the one field a human is expected to
correct, so it is the one field that follows the timestamp rule.

Key points:

- **One transaction for the whole batch** → a `4xx`/`5xx` means *nothing*
  landed, so resending is always correct. (1000 rows ≈ a few ms of SQLite work;
  measured: 256 rows in one transaction = 0.88 ms.)
- **A row that did not change writes no log entry and consumes no `seq`.**
  This is the single most important rule in the push. A client that fails
  mid-sync re-pushes everything it did not get an ack for; if those re-pushes
  were logged, every other device would re-download them forever, and the log
  would become a log of retries instead of a log of changes.
- Order within the batch is preserved, so pocket-before-money holds in the log.
- The server does **not** validate that `money.pocket_id` exists.
- Acks are emitted **after** the commit, not during the upload. The response is
  not a progress stream; allow a full round trip before timing out.

### 7.3 Ack catalog

```jsonl
{"t":"ack","i":0,"e":"pocket","s":"applied","seq":42}
{"t":"ack","i":1,"e":"money","s":"noop","seq":43}
{"t":"ack","i":2,"e":"money","s":"stale","seq":44,"row":{"money_id":"m_02",…}}
{"t":"done","frames":3}
```

| field | meaning |
| --- | --- |
| `i` | 0-based frame index, in the order the client sent them; one ack per frame, same order |
| `e` | which table the frame was for |
| `s` | `applied` \| `noop` \| `stale` |
| `seq` | the row's current seq on the server |
| `row` | only for `stale`: the server's winning row, so the client can merge immediately |

| `s` | meaning | what the client does |
| --- | --- | --- |
| `applied` | stored; it is now at `seq` | set `*_sync_at = seq`; may advance the pull bookmark to `seq` |
| `noop` | the server already had exactly this row; **no new seq was allocated** | set `*_sync_at = seq` |
| `stale` | the server's copy is newer and won; `row` is the winner | merge `row` over the local row (§8), set `*_sync_at = seq` |

For `money`, `stale` also covers the case where the client tried to change an
immutable field: the returned `row` is the truth, and merging it repairs the
local row.

### 7.4 Client algorithm

```
loop:
    batch = rows with *_sync_at IS NULL, pockets first, then the money rows
            that reference them, at most 1000 frames
    if batch is empty: break

    response = POST /v2/money/push  (body = batch)

    if 400 bad_frame → fix frame `index`; nothing landed; retry the batch
    if 413          → send a smaller batch
    if 415          → retry without Content-Encoding
    if 401          → stop
    if 5xx / network→ retry the same batch (with backoff)

    BEGIN LOCAL TRANSACTION
        for each ack:
            applied/noop → set *_sync_at = ack.seq
            stale        → merge ack.row by §8.2, set *_sync_at = ack.seq
    COMMIT
```

### 7.5 Retries and idempotency

Every frame is idempotent, in both directions:

| situation | result |
| --- | --- |
| ack lost, client re-pushes the same row | `noop`, no new seq, no new history |
| request failed after the server committed | client re-pushes → `noop` for all → nothing duplicated |
| two devices push the same row id | first wins by seq; the second gets `stale` with the winner |
| client pushes a row it just pulled | `noop` |

Because of this, **the client needs no retry bookkeeping at all**: resend the
batch, read the acks, move on.

### 7.6 Push errors

| HTTP | code | when | client action |
| --- | --- | --- | --- |
| `400` | `bad_frame` + `index` | a line is not valid JSON, `e` is not `pocket`/`money`, the primary key is missing/empty, or a required column is missing. Nothing was applied | fix the frame at `index`, resend the batch |
| `401` | `unauthorized` | bad token | stop |
| `413` | `payload_too_large` | over 1000 frames or 1 MB | split the batch |
| `415` | `unsupported_media_type` | `Content-Type` wrong, or `Content-Encoding` not identity/gzip | correct the headers |
| `500` | `internal` | server fault; nothing committed | retry with backoff |

---

## 8. Merging

There is **one merge rule per entity**, and it is applied in three places: on
the server when a pushed row already exists (merge point B), on the client when
a pulled row already exists locally (merge point A), and on the client when a
`stale` ack carries the server's row (merge point C). Same rule, same result —
no side is allowed its own interpretation.

### 8.1 What can change after a row is written

| column | `pockets` | `money` |
| --- | --- | --- |
| primary key | immutable | immutable |
| `pocket_name`, `pocket_type`, `pocket_ordering` | ✅ editable | — |
| `timestamp`, `money_value`, `pocket_id` | — | **immutable** |
| `money_note` | — | ✅ editable |
| `*_updated_at` | bumped by any edit | bumped by any edit |
| `*_deleted_at` | soft delete | soft delete |

Money is insert-only apart from its note: the amount, the business time and the
pocket are facts once recorded, and a later push must not rewrite them. The note
is the field a human is expected to correct.

### 8.2 The rule

**`pockets` — full last-writer-wins** (`pocket_updated_at`):

```
incoming.pocket_updated_at  >  stored.pocket_updated_at   → incoming wins, all columns
identical rows (incl. equal timestamp)                    → noop
otherwise                                                 → stored wins  ("stale")
```

**`money` — insert, note edit, soft delete; never re-price**:

```
no stored row                                             → insert        ("applied")
timestamp / money_value / pocket_id differ from stored    → stored wins   ("stale")
identical rows (incl. equal timestamp)                    → noop
incoming.money_updated_at > stored.money_updated_at       → note + deleted_at win ("applied")
otherwise                                                 → stored wins   ("stale")
```

In every "stored wins" case the response carries the server's row, so the losing
side repairs itself immediately instead of waiting for the next pull.

### 8.3 Details that matter

- **Ties go to the stored copy.** Equal timestamp + different content = the
  stored row wins. A client that edited locally with an equal timestamp sees
  `stale` and merges the server's row.
- **A soft-deleted row is an ordinary row.** `*_deleted_at` set means hidden,
  not missing; it merges by the same rule.
- **Comparison is on parsed values**, not on JSON text — formatting and key order
  never affect the decision.
- **An immutable-field conflict does not block the sync.** The `money` row comes
  back `stale` with the server's version; the client merges it, marks the row
  synced, and moves on. (Rejecting the batch instead would leave a device stuck
  syncing nothing at all until someone fixed the row by hand.)

### 8.4 The clock caveat, stated plainly

`*_updated_at` comes from the device's clock, so a device whose clock is behind
can lose a note edit to the server's copy. That is acceptable because the
numeric clock never decides *what a client has already seen* — only who wins a
tie (§2.2). Money's financial fields never depend on it at all (§8.1). When it
does go wrong, it is visible as a `stale` ack with a newer row in it.

---

## 9. Deletion

### 9.1 Everything is a soft delete

There is no delete frame, no tombstone table. A deleted row is a row with
`*_deleted_at` set to a timestamp:

```json
{"e":"money","r":{"money_id":"m_01",…,"money_deleted_at":1762000123000}}
```

It travels as a normal change and merges by the normal rule. Every read path
filters `WHERE money_deleted_at IS NULL`.

### 9.2 Deleting a pocket deletes its money rows — as soft deletes

Deleting a pocket must soft-delete it **and** every money row under it, in one
local transaction: set `*_deleted_at` and `*_updated_at` to the same timestamp
and clear `*_sync_at`, so both the pocket and its money rows get pushed.

**Never physically delete the money rows.** Rows removed locally have no
way to be represented on the wire, so other devices keep them forever and the
server keeps them too — a permanent divergence. (The server has no cascade: it
does not know the pocket was deleted.)

The desktop's current pocket-delete path does the wrong thing here: it deletes
the money rows outright. Because `money.pocket_id` has `ON DELETE CASCADE`, hard-deleting the pocket row itself would do the same. Both must change.

### 9.3 `del` lines are reserved

If a row is ever removed outright (no soft delete possible), the only honest
representation is:

```json
{"t":"del","s":42,"e":"money","id":"m_02"}
```

Nothing produces one today. A client should apply it (delete the local row and
continue) rather than crash, but it does not need to be built for.

---

## 10. Ordering and dependencies

- Within one response, changes are ordered by `seq` — strictly increasing.
- `money` depends on `pockets`: `money.pocket_id` is `NOT NULL`.
- The server does **not** enforce that dependency (no FK on the server) and it
  does not reorder pages, so **a money row can arrive before its pocket**.
- A push must send pockets first; the server applies a batch in order, so in
  practice the log has the pocket at a lower `seq`. The exception is two devices
  pushing concurrently.

### 10.1 What the client must do about it

The client's own schema is stricter than the server's:

```sql
money.pocket_id TEXT NOT NULL REFERENCES pockets (pocket_id) ON DELETE CASCADE
```

The client's connection enforces foreign keys by default. **So inserting a money
row whose pocket is absent will fail** — and if the whole page is one
transaction, the page rolls back and sync gets stuck retrying the same page
forever.

Apply a page like this instead:

```
applyPage(page):
    1. write every POCKET line first        (they keep their seq order)
    2. then write every MONEY line
    3. if a money row's pocket is still unknown → park it (a `pending_money`
       table, or an in-memory list persisted with the bookmark)
    4. at the start of every page, retry the parked rows; drop one from the
       park only when it was written successfully
```

Rules:

- **Never drop a money row** because its pocket is missing.
- **Never abort the page** for that reason.
- Two passes over one page costs nothing: the lines are already in memory, and
  partitioning by entity is stable, so each table's rows keep their `seq` order.
- The park should be small and short-lived. If it is not, something is wrong
  upstream (a pocket that was never pushed) and it is worth surfacing in the UI
  rather than swallowing.

---

## 11. The full sync cycle — pull → merge → push → merge

This is the spine of the whole mechanism. Every other section is a detail of one
of these four steps.

```
┌─────────────────────────────── the client ─────────────────────────────┐
│                                                                        │
│  ① PULL      GET /v2/money/pull/{bookmark}?limit=5000                  │
│              ← meta … row … row … done                                 │
│                                                                        │
│  ② MERGE     rows  → pockets / money              ═══ MERGE POINT A    │
│              bookmark = done.s                    (one transaction)    │
│                                                                        │
│  ③ PUSH      POST /v2/money/push                                       │
│              body = rows where *_sync_at IS NULL    (pockets first)     │
│              ← ack … ack … done                                        │
│                                                                        │
│  ④ MERGE     acks  → *_sync_at = seq, stale row   ═══ MERGE POINT C    │
│                                                   (one transaction)    │
│                                                                        │
└──────────────────────────────┬─────────────────────────────────────────┘
                               │ ③'s body arrives at the server
                               ▼
              ┌────────────────────────────────────┐
              │  ⑤ SERVER APPLY                    │  ═══ MERGE POINT B
              │     per frame: applied/noop/stale  │
              │     writes the row                 │
              │     appends ONE log entry          │
              │     takes the next seq             │
              └────────────────────────────────────┘
```

### 11.1 Step by step, with what changes where

| # | action | client state after | server state after |
| --- | --- | --- | --- |
| ① | `GET /v2/money/pull/{bookmark}` | unchanged | unchanged (read-only) |
| ② | merge rows, commit page + bookmark | rows merged, `bookmark = done.s` | unchanged |
| ③ | `POST /v2/money/push` with `*_sync_at IS NULL` rows | unchanged until the response | rows written, log entries appended, `seq` allocated per written row |
| ④ | merge acks, commit | `*_sync_at = seq` per frame, `stale` rows merged | unchanged |

Nothing is written on the server until ③, and nothing the server wrote is
visible to this client until its next ①.

### 11.2 The three merge points

| point | where | input | rule |
| --- | --- | --- | --- |
| **A** | client, after a pull | a `row` line | §8.2, with "stored" = the local row |
| **B** | server, during a push | a pushed frame | §8.2, with "stored" = the server's row |
| **C** | client, after a push | an `ack` line | `applied`/`noop` → mark synced; `stale` → merge the returned `row` by §8.2 |

A and B being the *same* rule is what makes the system predictable: whichever
side is newer wins, wherever the comparison happens, and a client that merges
exactly as the server does can never oscillate.

### 11.3 Order matters: pull before push

- Every row pulled is marked synced as it is merged, so it is never pushed back.
  Push first and the client re-uploads what it was about to receive.
- Pushing after a fresh pull means the client's rows are based on the newest
  state, so `stale` answers are rare.
- The cycle is therefore **pull → push → pull**, and the final pull is usually a
  single empty page (`{"t":"meta"}` + `{"t":"done"}`), which picks up whatever
  another till wrote during step ③.

### 11.4 When the cycle ends

```
syncMoneyGroup():
    loop:                                  # ① ②
        page = GET /v2/money/pull/{bookmark}?limit=5000
        merge + commit
        if not page.more: break

    loop:                                  # ③ ④
        batch = rows with *_sync_at IS NULL, pockets first, ≤1000
        if batch is empty: break
        acks = POST /v2/money/push (batch)
        merge + commit

    one more pull from {bookmark}          # picks up other devices' work
```

Both loops terminate: the first because the log is finite, the second because
every acked row gets its `*_sync_at` set.

If there is nothing to push, ③ and ④ are skipped entirely — no request is made.
If nothing changed anywhere, the whole cycle is two requests (`pull` → empty,
`push` → skipped, final `pull` → empty).

### 11.5 When to run a cycle

| trigger | typical shape |
| --- | --- |
| app start | one full cycle |
| after each completed sale | `pull` (often empty) + `push` (one row) — the cheapest shape |
| timer, e.g. every 30 s | catches other tills' work |
| manual button | support and debugging |

Running it often is what keeps the backlog small — and a small backlog is what
makes "resend the whole batch on failure" an acceptable strategy (§7.5).

---

## 12. Worked end-to-end example

Two devices, A and B. Both start empty (`bookmark = 0`). Server counter starts
at 0.

```
t1  A: creates pocket p_01
      POST /v2/money/push   {"e":"pocket","r":{"pocket_id":"p_01","pocket_name":"Cash",…}}
      ← {"t":"ack","i":0,"e":"pocket","s":"applied","seq":1}
        {"t":"done","frames":1}
      A: pocket_sync_at = 1        (counter = 1)

t2  A: records a sale into p_01
      POST /v2/money/push   {"e":"money","r":{"money_id":"m_01","pocket_id":"p_01","money_value":5000,…}}
      ← {"t":"ack","i":0,"e":"money","s":"applied","seq":2}
      A: money_sync_at = 2         (counter = 2)

t3  B: first sync
      GET /v2/money/pull/0
      ← {"t":"meta","snapshot":2}
        {"t":"row","s":1,"e":"pocket","r":{p_01…}}
        {"t":"row","s":2,"e":"money","r":{m_01…}}
        {"t":"done","s":2,"more":false}
      B: writes both rows + bookmark=2 in one transaction

t4  A: the ack from t2 was lost; A retries the same row
      POST /v2/money/push   {"e":"money","r":{"money_id":"m_01",…}}   (unchanged)
      ← {"t":"ack","i":0,"e":"money","s":"noop","seq":2}
      A: money_sync_at = 2         (counter STILL 2 — no new history)

t5  B: edits the note on m_01, bumps money_updated_at
      POST /v2/money/push   {"e":"money","r":{"money_id":"m_01","money_note":"kopi",…}}
      ← {"t":"ack","i":0,"e":"money","s":"applied","seq":3}
                                   (counter = 3)

t6  A: pulls
      GET /v2/money/pull/2
      ← {"t":"meta","snapshot":3}
        {"t":"row","s":3,"e":"money","r":{…"money_note":"kopi"…}}
        {"t":"done","s":3,"more":false}
      A: 3 > 2, so the edit applies

t7  B: a stale push (B tries to write an older version, e.g. after being offline)
      POST /v2/money/push   {"e":"money","r":{"money_id":"m_01","money_updated_at":older,…}}
      ← {"t":"ack","i":0,"e":"money","s":"stale","seq":3,"row":{…the server's row…}}
      B: merges the returned row, money_sync_at = 3

t8  B: a buggy build tries to change the AMOUNT of an existing entry
      POST /v2/money/push   {"e":"money","r":{"money_id":"m_01","money_value":9999,…}}
      ← {"t":"ack","i":0,"e":"money","s":"stale","seq":3,"row":{…"money_value":5000…}}
      B: the amount is repaired locally, money_sync_at = 3, sync continues
          (nothing was logged: the ledger did not change)
```

What to notice:

- **t4** produced no new `seq`. That is the property that keeps retries from
  becoming history.
- **t5/t6**: a change is visible to another device as soon as its `seq` exists —
  no clock, no "wait until the timestamp settles".
- **t7**: the loser of a conflict is told immediately, with the winner's row, so
  it never has to wait for a pull to discover it.
- Throughout, the only client state is one integer per device (`bookmark`) plus
  the `*_sync_at` dirty flags.

---

## 13. Guarantees, and what is not guaranteed

**Guaranteed**

1. A client that stops at bookmark `N` and asks again with `N` receives every
   change above `N` — no gaps, no dependence on clocks.
2. Re-requesting the same range returns the same entries in the same order.
3. A row applied twice is applied once (idempotent, both directions).
4. A retried push never creates duplicate history.
5. A pull page never contains a change with a `seq` above its `meta.snapshot`.
6. Within one response, `s` values are strictly increasing.

**Not guaranteed**

1. **Ordering across tables inside a page.** A money row may precede its pocket.
2. **Delivery timing.** A change is visible to another device on its *next*
   pull, whenever that happens.
3. **Exactly-once delivery.** Duplicates happen and are harmless.
4. **A row's history is kept forever.** Once retention pruning exists (§17.2), a
   very stale client must resync from zero and gets `410`.
5. **Clock sanity.** `*_updated_at` comes from devices; a skewed device can lose
   a tie (§8.4). For `money` this can only ever affect the **note**, never an
   amount or a timestamp.

---

## 14. What is implemented today

The contract is the same either way, but do not test against behaviour that does
not exist yet.

| behaviour | state |
| --- | --- |
| `GET /v2/money/pull/:seq` | **works** |
| pull paging (`?limit`), `meta`/`row`/`done` lines | **works** |
| `400` when the bookmark is ahead of the server | **works** |
| sync-token auth on `/v2/*` | **works** |
| `POST /v2/money/push` and its acks | **works** — `src/v2/money-push.ts` |
| anything writing the log | **works** — a push writes the row, spends one seq and appends one log entry, all in one transaction |
| `410 too_old` (retention) | **not implemented** — no history is ever pruned |
| backfill of pre-existing rows | **not implemented** (§17.2.2) |

---

## 15. Requirements the server implementation must satisfy

Behaviour only — how it is built is deliberately not specified here.

### 15.1 Bridging the push to the log

- Applying a pushed row and appending its log entry must be **atomic**: either
  both are visible or neither is. A reader must never see a row whose change is
  absent from the log, or a change in the log for a row that was not written.
- The seq must be allocated **inside** that same atomic unit, so two concurrent
  pushes cannot be given the same seq or reordered.
- A pushed change that does not modify anything must produce **no** log entry and
  consume **no** seq (§7.2).
- The log entry's payload must be the row **as stored after the write** — not the
  bytes the client sent. For `money` that means the server's immutable columns
  plus the accepted note.

### 15.2 Batch atomicity

- One push request is applied atomically (§7.2): a `4xx`/`5xx` response must
  mean nothing from that batch is visible.
- Applying a batch must not block other clients for long. A bounded batch
  (1000 frames) is small enough that this is not a design problem; it becomes
  one only if the batch bound is raised without thought.

### 15.3 Pull correctness

- The snapshot must be read **before** the first entry is read, and every entry
  in the response must satisfy `seq <= snapshot` (§6.2).
- Repeating a request with the same bookmark and the same server state must
  produce the same entries, in the same order.
- A page must never contain a gap: if it contains up to seq `N`, it contains
  every change in `(bookmark, N]`.

### 15.4 Behaviour that must be tested

Observable outcomes, not implementation:

1. new row → `applied`; pulling afterwards returns exactly that row
2. identical re-push → `noop`; nothing new appears in any pull
3. **money note edit** (immutables unchanged, newer `money_updated_at`) → `applied`, and the new note is what other clients pull
4. money note edit with an **older** `money_updated_at` → `stale`, server's row returned, nothing new to pull
5. **money amount / timestamp / pocket changed** → `stale`, server's row returned, nothing new to pull
6. money soft delete → `applied`, other clients pull a row with `money_deleted_at` set
7. pocket rename → `applied`, all columns replaced
8. pocket with an older `pocket_updated_at` → `stale`
9. two frames for the same id in one batch → two acks, the later one wins
10. malformed line in a batch → `400` with the right `index`, and **nothing** from that batch is afterwards visible
11. batch over the limit → `413`
12. money referencing an unknown pocket → accepted (there is no FK to violate)
13. push then pull → the page contains what was pushed, in seq order
14. `Content-Encoding: gzip` accepted; `br` → `415`

---

## 16. Conformance checklist (client)

- [ ] stores one integer bookmark for the group; never one per table
- [ ] `GET /v2/money/pull/:seq` with `Accept-Encoding: gzip`, handles `Content-Encoding: gzip`
- [ ] merges lines as they arrive; commits **once per page**
- [ ] writes rows and the bookmark in the **same** transaction
- [ ] bookmark = `done.s` (never `meta.snapshot`)
- [ ] loops while `more: true`
- [ ] on `400`/`410` from pull: reset bookmark to 0, discard **synced** local rows (keep `*_sync_at IS NULL` ones and re-push them), resync
- [ ] selects `*_sync_at IS NULL` rows, pockets before money, ≤1000 per batch
- [ ] `POST /v2/money/push` with `Content-Type: application/x-ndjson`
- [ ] applies each ack: `applied`/`noop` → set `*_sync_at`; `stale` → merge the returned row
- [ ] retries a failed batch whole; never tries to resume mid-batch
- [ ] applies a page in two passes (pockets, then money) and **parks** a money row whose pocket is still unknown instead of failing the page or dropping the row (§10.1)
- [ ] soft-deletes money rows when a pocket is deleted; never `DELETE`s them
- [ ] bumps `*_updated_at` on every local edit (otherwise the edit never travels)
- [ ] **never changes a money row's `timestamp`, `money_value` or `pocket_id`** — a correction is a new money row, not an edit (§8.1)
- [ ] note edits update `money_note` **and** `money_updated_at`, and clear `money_sync_at`
- [ ] fixes `updateMoneyNote`: it currently writes `money_unsync_at`, a column that does not exist
- [ ] never runs v1 and v2 for these tables at the same time

---

## 17. Open decisions

### 17.1 Blocking the push implementation

1. **Writer: apply code or triggers.** Resolved: application code. The writer
   lives in `applyPush()` (`src/v2/money-push.ts`) and calls `nextSeq()` +
   `appendChangeAt()` (`src/v2/money-log.ts`) inside the caller's transaction, so
   the entity row, the seq and the log entry move together. No triggers: an
   application-level writer can decide `applied`/`noop`/`stale` per frame and
   skip the log for a frame that changed nothing, which a trigger cannot.

### 17.2 Not blocking, but unspecified in code

1. **Retention**: history is kept forever today. Once it is pruned, the rule must
   be "never drop anything above the slowest live client's bookmark", and anyone
   below that gets `410` (§6.6).
2. **Backfill**: an existing database has money/pocket rows and no history. Seed
   one `put` per current row, in id order, so a fresh device and an upgraded one
   see the same story.
3. **Per-row seq bookkeeping on the server** is the server's own business and
   not part of this contract.
4. **Pocket validation on push**: reject a money row whose pocket is unknown, or
   accept it? Currently specified as accept (no FK).

---

## 18. Appendices

### 18.1 Limits

| limit | value | where |
| --- | --- | --- |
| pull `limit` default | 5000 entries | §6.1 |
| pull `limit` max | 20000 entries | §6.1 |
| push batch | 1000 frames / 1 MB uncompressed | §7.1 (spec) |
| seq range | 1 … 2^63 | server counter |
| row `payload` size | unbounded (no images in this group) | — |

### 18.2 Error codes (both endpoints)

| code | HTTP | endpoint | meaning |
| --- | --- | --- | --- |
| `bad_request` | 400 | pull | bad `:seq`, or a bookmark ahead of the server |
| `bad_frame` | 400 | push | a line is invalid; `index` says which |
| `unauthorized` | 401 | both | missing/unknown/revoked token |
| `not_found` | 404 | both | wrong path or unknown route |
| `too_old` | 410 | pull | ⚠ not implemented: bookmark older than retained history |
| `payload_too_large` | 413 | push | batch over the limit |
| `unsupported_media_type` | 415 | push | bad `Content-Type` or `Content-Encoding` |
| `internal` | 500 | both | server fault |

### 18.3 The client's tables (for reference)

These are the desktop's tables as they exist today; the server's schema is not
part of this contract.

```sql
CREATE TABLE pockets (
  pocket_id TEXT PRIMARY KEY, pocket_name TEXT NOT NULL,
  pocket_type TEXT NOT NULL DEFAULT 'absolute',   -- REFERENCES pocket_enum(v)
  pocket_ordering INTEGER NOT NULL, pocket_updated_at INTEGER NOT NULL,
  pocket_sync_at INTEGER, pocket_deleted_at INTEGER) STRICT;

CREATE TABLE money (
  money_id TEXT PRIMARY KEY, timestamp INTEGER NOT NULL, money_value REAL NOT NULL,
  pocket_id TEXT NOT NULL REFERENCES pockets (pocket_id) ON DELETE CASCADE,
  money_note TEXT NOT NULL DEFAULT '', money_updated_at INTEGER NOT NULL,
  money_sync_at INTEGER, money_deleted_at INTEGER) STRICT;
```

### 18.4 Running it locally

```bash
bun install
docker compose up -d          # Valkey (token cache) + VictoriaLogs (request log)
bun run start                 # :8787, applies migrations on boot
cat data/.admin-password      # the admin password, plaintext, local only
bun test test/unit && bun run test:integration
```

A fresh database starts with an empty log: nothing appears in a pull until a
client pushes something (or a backfill seeds the log — §17.2.2).

### 18.4.1 Verifying with curl

```bash
ADMIN=$(cat data/.admin-password)
TOK=$(curl -s -X POST http://127.0.0.1:8787/v1/admin/tokens \
      -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
      -d '{"label":"probe"}' | jq -r .token)

# pull (empty until something is pushed)
curl -s -N "http://127.0.0.1:8787/v2/money/pull/0" -H "Authorization: Bearer $TOK"

# push one pocket, then pull it back
curl -s -N http://127.0.0.1:8787/v2/money/push -H "Authorization: Bearer $TOK" \
     -H 'Content-Type: application/x-ndjson' \
     -d '{"e":"pocket","r":{"pocket_id":"p_01","pocket_name":"Cash","pocket_type":"absolute","pocket_ordering":1,"pocket_updated_at":1762000000000,"pocket_deleted_at":null}}'

# pull with a page size
curl -s -N "http://127.0.0.1:8787/v2/money/pull/0?limit=2" -H "Authorization: Bearer $TOK"

# a bookmark ahead of the server must be a 400
curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:8787/v2/money/pull/999" \
     -H "Authorization: Bearer $TOK"

# no token → 401
curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:8787/v2/money/pull/0"
```

### 18.5 Related documents

| file | what it is |
| --- | --- |
| `docs/SYNC-CONTRACT.md` | the **v1** contract (byte-offset resume, prefix hash chain, aggregate frames). Still describes the running v1 endpoints; not used by v2 |
| `docs/PROPOSAL-DISCUSSION.md` | the review that led here: 18 problems found in an earlier ticket-buffer design, and the reasoning that produced the change log |
| `docs/LOGS.md` | the server's request log (a different thing entirely; useful when debugging why a request failed) |
