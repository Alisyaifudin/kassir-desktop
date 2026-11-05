# Kassir Sync v2 — one-product manual sync · end-to-end contract

**Status:** proposed (client + server implement this document together)
**Applies to:** `kassir-backend` (Bun + Hono + SQLite) and `kassir-desktop`
(Tauri + SQLite)
**Depends on:** [`SYNC-V2.md`](SYNC-V2.md) §8.7 and
[`SYNC-V2-PRODUCT.md`](SYNC-V2-PRODUCT.md) (the product group)

This document is normative for the **one-product manual sync**: a scoped,
user-triggered sync for exactly one product and the rows that belong to it. It
adds three things to the product group; it changes none of the existing rules.

1. `GET /v2/product/one/pull/{product_id}` — the server's current snapshot of
   one product and its baggage.
2. `POST /v2/product/one/push/{product_id}` — a push batch that the server
   refuses unless every frame belongs to that product.
3. `product_id` as an optional filter on the existing image manifest.

There is **no new table, no new column, no migration and no new merge rule**.
The six product-group dictionaries, clocks, tombstones, LWW/append-only rules
and image-byte side channel are exactly those of the product group.

---

## 0. How to read this

| If you are… | read |
|---|---|
| a client author | §2 (pull), §3 (push), §4 (images), §5 (cycle), §7 (checklist) |
| a server author | §2, §3, §4, §6 (conformance) |
| debugging a disagreement | §5.4, §8 |

Where this document and the code disagree, this document wins until both are
updated. Where this document and the product-group contract disagree about a
row, clock or merge decision, the product-group contract is authoritative; this
document only says **which rows** are in scope and **how they are paged**.

---

## 1. What this is

The full product-group cycle is a bookmark-driven stream over the whole
catalogue. A shop with a hundred thousand stock events cannot run that cycle
from a product page just to publish one price change, and the operator pressing
a button on one product expects *that product* to move, not the catalogue.

A one-product sync is therefore:

- **scoped** — exactly one `product_id` and the rows whose current
  `product_id` is that value;
- **bidirectional** — push what this device owes for the product, then pull the
  server's current snapshot for it;
- **bookmark-free** — it never reads or writes `sync_bookmark`, so it cannot
  skip a change in the normal product stream;
- **idempotent** — every frame and every pulled row goes through the existing
  product-group merge rules, so running it twice, concurrently with a full
  cycle, or after a crash is always safe.

It is **not** a replacement for the full sync. It does not sync money,
customers, suppliers, methods, socials, extras or records. Product events may
reference a record that has not arrived; that is allowed by the product
contract (`record_id` may dangle).

### 1.1 Scope is the row's current `product_id`

Every entity in the group carries `product_id`: the `product` entity uses it as
its primary key; the five children carry it as a foreign key. A row belongs to
the scope of `P` **iff its current `product_id` is `P`**.

Consequence: re-parenting a listing from product A to product B moves it out of
A's scope and into B's. The A detail page will not push or pull it after the
re-parent; the B detail page (or the full product cycle) will. This is the same
rule the full sync uses — a listing is a normal LWW row, and its `product_id` is
an ordinary editable column.

`category` is the one exception: it carries no `product_id`, because a category
is a shared label rather than a child of a product. A scoped push skips it and
leaves it to the full product cycle. The link row `product_category` **is** in
scope (it has a `product_id`), so it can arrive naming a category neither side
has received yet — the dangling reference `SYNC-V2.md` §7.2 tolerates: store it,
keep it, do not draw it.

### 1.2 Endpoints

| Direction | Call | What comes back |
|---|---|---|
| pull | `GET /v2/product/one/pull/{product_id}?after={cursor}&limit={n}` | `meta` → `row` … → `done` |
| push | `POST /v2/product/one/push/{product_id}` (NDJSON body) | `ack` per frame → `done` |
| image bytes | `GET /v2/product/image/manifest?product_id={product_id}&after={image_id}&limit={n}` | the existing manifest, filtered |

The three routes use the same bearer token, identity headers, NDJSON framing,
gzip rules and error envelope as every other v2 route (`SYNC-V2.md` §2).

### 1.3 What is in the baggage

| entity | rows in scope |
|---|---|
| `product` | the one row with `product_id = P` |
| `product_name` | all rows with `product_id = P`, including aliases and tombstones |
| `property` | all rows with `product_id = P`, including tombstones |
| `listing` | all rows with `product_id = P`, including tombstones |
| `image` | all rows with `product_id = P`, including tombstones |
| `product_event` | all events with `product_id = P`; append-only, never deleted |
| `category` | none — a group-wide row with no `product_id`; the full product cycle carries it |

`stocks` is **not** in the baggage. It is a local projection of the event
journal and is rebuilt by the client's existing `mergePage` rule after events
arrive.

Image **bytes** are not rows. They follow the scoped image rows through the
existing blob side channel (§4 below).

---

## 2. Scoped pull — `GET /v2/product/one/pull/{product_id}`

### 2.1 Request

```
GET /v2/product/one/pull/01JP1?after=3%3A01JL1&limit=5000
Authorization: Bearer kst_…
Accept: application/x-ndjson
Accept-Encoding: gzip
```

| parameter | required | meaning |
|---|---|---|
| `product_id` | path | the scope; non-empty |
| `after` | query | opaque cursor from the previous `done.cursor`; omit for page 1 |
| `limit` | query | entries in this page; default **5000**, max **20000**; invalid/`<1` → default, `>20000` → capped |

`after` is **opaque**. A client must store the exact `done.cursor` string and
send it back; it must not parse, sort or construct one. The server's encoding is
an implementation detail and may change.

### 2.2 Response

One NDJSON stream:

```json
{"t":"meta","snapshot":4242,"product_id":"01JP1"}
{"t":"row","s":17,"e":"product","r":{"product_id":"01JP1","product_name":"Kopi Susu","product_note":"","product_flag":0,"product_updated_at":1762000000000,"product_deleted_at":null}}
{"t":"row","s":31,"e":"listing","r":{"listing_id":"01JL1","product_id":"01JP1","listing_name":"Kopi Susu 250ml","listing_price":25000,"listing_unit":1,"listing_kind":"","listing_code":"8998866200011","listing_updated_at":1762000000000,"listing_deleted_at":null}}
{"t":"done","s":31,"more":true,"cursor":"3:01JL1"}
```

#### `meta`

| field | meaning |
|---|---|
| `snapshot` | the server's `sync_seq_counter` when the response started. **Informational only** — it is not a bookmark for this route. |
| `product_id` | echoes the requested scope |

#### `row`

Exactly the product group's `row` line (`SYNC-V2.md` §3.2):

| field | meaning |
|---|---|
| `s` | this row's `sync_seq` on the server |
| `e` | `product` \| `product_name` \| `property` \| `listing` \| `image` \| `product_event` |
| `r` | the row, every column of that entity's dictionary, in canonical order |

- A soft-deleted row is an ordinary `row` with `*_deleted_at` set.
- No `del` line is ever produced by this route. The product group reserves
  `del`, but a snapshot describes rows that exist, tombstones included.
- `s` is informational for the client's *cursor* (which is `done.cursor`), but
  it is the correct value for the local `*_sync_at` marker when the row is
  merged: the server has that version.
- `s` values are **not necessarily increasing** in this response. The snapshot
  is ordered by `(entity order, primary key)`, not by `seq`.

#### `done`

| field | meaning |
|---|---|
| `s` | highest `sync_seq` among the rows in this page, or `0` for an empty page. **Do not use as a bookmark.** |
| `more` | `true` iff more rows exist above the cursor in the same snapshot |
| `cursor` | the opaque cursor of the last returned row when `more` is `true`; `null` otherwise |

When `more` is `true`, the client must call again with `after` set to that exact
`cursor`. When `more` is `false`, the snapshot is complete.

### 2.3 Ordering and paging

Rows are returned in the product group's fixed order, then primary key
ascending:

```
product → product_name → property → listing → image → product_event
```

Within one entity, the primary key is unique, so `(entity_index, primary key)` is
a stable keyset cursor. A row that changes between pages may be returned once
(new or old state, depending on timing) or returned again on a later page; the
client's LWW/append-only merge makes either outcome converge. A row is never
returned twice **within one page**.

The cursor is encoded by the server; examples in this document must not be
constructed by a client. A client that loses a cursor starts again with no
`after` — the response is a snapshot, so restarting is always correct.

### 2.4 Server algorithm (pseudo code)

```
ENTITY_ORDER = [product, product_name, property, listing, image, product_event]

function pullOne(db, productId, after, limit):
    if after is absent:
        start = { index: 0, pk: "" }
    else:
        start = decodeCursor(after)            // rejects malformed with 400

    snapshot = current counter
    out = []
    remaining = clamp(limit, 1, 20000)
    more = false

    for index from start.index to last:
        afterPk = (index == start.index) ? start.pk : ""
        rows = SELECT * FROM ENTITY_ORDER[index].table
               WHERE product_id = $productId
                 AND primary_key > $afterPk
               ORDER BY primary_key
               LIMIT remaining + 1

        take = rows[0 .. remaining]
        out += take
        remaining -= len(take)

        if len(rows) > len(take):
            more = true
            break

        if remaining == 0:
            more = existsAnyRowAfter(db, productId, index, lastPkOf(take))
            break

    cursor = more ? encodeCursor(last entity index, last primary key) : null
    s = max(row.sync_seq for row in out, default 0)
    return { snapshot, rows: out, s, more, cursor }
```

`product` is special only in that its `product_id` **is** its primary key; the
same `WHERE product_id = ? AND product_id > ?` works.

The route streams the lines: `meta`, then `row` lines, then `done`. It may
materialise the page first (the snapshot is bounded by `limit`), and it may
gzip the response exactly like the existing pull.

### 2.5 Client algorithm (pseudo code)

```
function pullOneProduct(db, transport, endpoint, productId):
    after = null
    pulled = 0
    repeat:
        stream = transport.productPull(endpoint, { productId, after, limit: 5000 })
        page = collectRowLines(stream)          // ignores meta/done fields except more/cursor
        if page has no done line: fail bad_frame
        mergePage({ db, execute: mergeOneTransaction },
                  group = "product",
                  page = { changes: page.rows, aggregates: [], deletions: [] },
                  parked = [],
                  commit = undefined)           // MUST NOT write a bookmark
        pulled += len(page.rows)
        after = page.cursor
    while page.more == true

    refreshProductService()
    return pulled
```

Client rules:

- **Never** write `sync_bookmark` from this route. The full product cycle's
  bookmark must move only in a `/v2/product/pull/:seq` page transaction
  (`SYNC-V2.md` §9.4.1).
- **Never** treat `done.s` as a bookmark or as an upper bound for future pages.
- Merge exactly as a normal product pull page would: a local row with a newer
  clock wins (`stale` — write nothing, keep it dirty); an identical row is a
  `noop` and may be marked synced with the row's `s`; a newer server row is
  applied and marked synced; a missing local row is inserted and marked synced;
  a local `product_event` id that already exists is a `noop`.
- Rebuild `stocks` for the product after events arrive — the existing
  `mergePage` product branch already does this.
- If the product has no rows on the server, the response is one empty page
  (`done.more = false`). That is not an error: the client may push the product
  next.

---

## 3. Scoped push — `POST /v2/product/one/push/{product_id}`

### 3.1 Request

```
POST /v2/product/one/push/01JP1
Authorization: Bearer kst_…
Content-Type: application/x-ndjson
Content-Encoding: identity          (or gzip)

{"e":"product","r":{…}}
{"e":"listing","r":{…}}
{"e":"product_event","r":{…}}
```

The body is **byte-for-byte the same format** as `POST /v2/product/push`
(`SYNC-V2.md` §4.1): bare frames, one per line, no `t`, no session, no upload id,
no offset, no hash chain.

Limits and headers are identical:

| limit | value |
|---|---|
| frames | 1000 |
| uncompressed body | 1 MB |
| `Content-Type` | `application/x-ndjson` |
| `Content-Encoding` | `identity` or `gzip` |

### 3.2 Scope check (the one new server rule)

After parsing every frame — and **before** the apply transaction — the server
checks every frame's `r.product_id`:

```
for (index, frame) in frames:
    if frame.r.product_id != {product_id}:
        throw bad_frame(index,
            `"r.product_id" is "${frame.r.product_id}", not the scoped product "${product_id}"`)
```

This applies to all six entities. For `product`, `product_id` is both the scope
and the primary key, so the check is the same expression.

Nothing is applied when the check fails: the batch is `400 bad_frame` with the
offending `index`, exactly like a malformed frame. A client must never send
another product's rows to this route; if it does, that is a bug, not a conflict.

### 3.3 Apply, acks, log and seq

Once every frame is in scope, the server applies the batch with **the existing
product-group push** (`src/v2/product-push.ts` / `applyPush`) — no new merge
rule, no new branch:

- catalog rows: plain LWW on their `*_updated_at`, tie → stored copy wins;
- `product_event`: insert if absent, `noop` if present, payload not compared;
- one ack per frame, in request order: `applied` / `noop` / `stale`;
- a `stale` ack carries the server's winning row;
- one transaction for the whole batch: a `4xx`/`5xx` means nothing landed;
- an `applied` frame allocates a `seq` and appends one
  `product_group_change_log` entry, exactly as a normal product push does;
- `noop`/`stale` spend no `seq` and write no log entry.

**The scoped route does not bypass the log.** Rows pushed here become visible to
every other device through its normal `/v2/product/pull/:seq` stream. That is
deliberate: a scoped push is a short path into the same log, not a private
side-channel.

Response body: the same ack stream as `/v2/product/push`, ending in
`{"t":"done","frames":N}`.

```
{"t":"ack","i":0,"e":"product","s":"applied","seq":17}
{"t":"ack","i":1,"e":"listing","s":"stale","seq":12,"row":{…}}
{"t":"done","frames":2}
```

### 3.4 Client push loop (pseudo code)

```
function pushOneProduct(db, transport, endpoint, productId, execute):
    pushed = 0
    stale = 0
    for pass in 0 .. MAX_PASSES:
        frames = []
        bytes = 0
        for entity in [product, product_name, property, listing, image, product_event]:
            rows = SELECT * FROM entity.table
                   WHERE sync_at IS NULL AND product_id = $productId
                   ORDER BY entity.order
                   LIMIT remaining
            for row in rows:
                line = encodeRowFrame(entity, toCanonicalRow(entity, row))
                if bytes + len(line) > 1MB:
                    stop; use the frames collected so far
                frames += { entity, id, clock, line }
        if frames is empty: break

        acks = POST /v2/product/one/push/{productId} with the frames' lines
        applyAcks(frames, acks)       // same compare-and-set as the full push:
                                      // applied/noop -> sync_at = seq, guard by sent clock
                                      // stale -> merge server row, guard by sent clock
        pushed += acked frames
        stale  += stale acks
    return { pushed, stale }
```

Batching is the client's job; the server accepts at most 1000 frames / 1 MB per
request. A product with more dirty rows than one batch is pushed in several
requests. Every batch is atomic and idempotent.

Ordering: parents before children, and events after the product. The server does
not enforce order (it accepts any frame order), but the client must not rely on
that: the same batch is what a full sync would send.

---

## 4. Image bytes in the scoped sync

Image **rows** are already in the scope (§1.3). Image **bytes** use the existing
three blob routes with one additive change:

### 4.1 Manifest filter

```
GET /v2/product/image/manifest?product_id=01JP1&after={image_id}&limit={n}
```

`product_id` is optional and additive. When present, the manifest join adds:

```sql
AND i.product_id = $product_id
```

Everything else is unchanged: live image rows only, the blob whose `version`
equals the row's current `image_updated_at`, ordered by `image_id`, paged by
`after`/`next`, no `seq` and no bookmark.

A client that omits `product_id` gets exactly today's behaviour. A client that
sends an unknown `product_id` gets an empty page, not an error.

### 4.2 Scoped upload and fetch

The client applies its existing two blob passes with `product_id = P`:

| pass | selection |
|---|---|
| upload | `image_deleted_at IS NULL AND image_sync_at IS NOT NULL AND image_blob_sync_at IS NULL AND image_blob_version = image_updated_at AND product_id = P` |
| fetch | `image_deleted_at IS NULL AND image_blob_version IS NOT image_updated_at AND product_id = P`, then manifest filtered by `product_id = P` |

All existing conflict rules still apply: `409 blob_conflict` means adopt the
server's copy and forget the local version; `404 image_unknown` means the row
has not been accepted yet (do not upload); downloaded bytes set
`image_blob_sync_at` so they are never re-uploaded. Bytes never gate the row
snapshot: a missing picture is a placeholder (§8.7.1).

The upload route is unchanged and remains keyed by `image_id`; a client cannot
upload bytes for an image outside the scope because it never selects one.

---

## 5. The client cycle

### 5.1 Order

```
1. claim the sync gate                      (refuse if a full run or another scoped run is active)
2. resolve endpoint + health protocol       (same as the full run)
3. push the product's dirty rows            (all batches)
4. pull the product snapshot                (all pages, no bookmark)
5. refresh the product service              (so the detail page paints)
6. upload image bytes for the product
7. fetch image bytes for the product
8. refresh the product service again
9. report counts
```

Push before pull, not the full cycle's pull → push → pull, because a scoped pull
is already the authoritative post-push snapshot: it is taken **after** the push
and therefore includes every row this device just sent, as well as anything
another device wrote. This is one pass instead of three and converges by the
same LWW rules. A local row the server already had newer comes back as `stale`
on the push ack, so it is repaired before the pull even starts.

### 5.2 Serialisation

A one-product sync is a short product-group cycle. It shares the client's
single-flight gate with the full sync:

- if a full sync (or a reset) is running, the scoped sync is **refused**
  (`SyncError` code `busy`, message "Sinkronisasi lain sedang berjalan"); the
  user can try again when it finishes;
- while a scoped sync is running, `start` for a full sync is refused the same
  way; it is **not** coalesced into the scoped run;
- two scoped syncs are serialised too, even for different products. The backend
  could tolerate them (the merge rules are per row), but the client has one
  service, one refresh path and one UI, so one at a time is the contract.

A crash or cancellation at any point is safe: the push is idempotent, the pull
is a snapshot, and the bookmark was never touched.

### 5.3 What the user sees

On the product detail page, an admin-only button next to the publish chip
("Sinkronkan produk", refresh icon, spinner while running). On success it shows
the report (`pushed`/`pulled`/`stale`, optional image counts) in a toast; on
failure the `SyncError.message`. The button is disabled while a full sync is
running, and while its own request is in flight.

No progress pill is started: this is a foreground action on one screen, not a
background run.

### 5.4 Interaction with a concurrent full sync

The client refuses to overlap them (§5.2), which is stricter than the wire
requires. The wire is safe even if an implementation allows overlap:

- both directions are idempotent;
- every row write is guarded by its clock;
- a scoped pull does not move the full cycle's bookmark;
- a scoped push appends to the same log and allocates normal `seq` values.

The only thing overlap would cost is duplicated work and two refresh paints, not
correctness.

---

## 6. What the server must do

1. **Register the two routes** under the existing `/v2/product/*` token gate and
   request log.
2. **Scoped pull**:
   - validate `product_id` is non-empty;
   - decode `after` as an opaque cursor; malformed → `400 bad_request`;
   - read rows from the six entity tables, filtered by `product_id`, in
     `(entity order, primary key)` order;
   - include live rows and tombstones; never emit `del`; never read or write
     `product_group_change_log` for this route;
   - clamp `limit` to 1…20000 (default 5000);
   - emit `meta`, `row`s, `done` with `more` and `cursor` exactly as §2.2;
   - allocate no `seq`, touch no bookmark, write no log entry.
3. **Scoped push**:
   - the same body parsing, bounds, content coding and atomicity as
     `POST /v2/product/push`;
   - reject any frame whose `r.product_id` differs from the path scope with
     `400 bad_frame` and the frame `index`; nothing from that batch is applied;
   - otherwise call the existing product `applyPush` unchanged, including log
     writes and `seq` allocation for `applied` frames;
   - return the existing ack stream.
4. **Manifest**:
   - accept optional `product_id` on `GET /v2/product/image/manifest`;
   - add `AND i.product_id = ?` to the existing join when present;
   - keep the response shape, ordering and paging unchanged.
5. **OpenAPI**: document both new paths and the `product_id` query parameter,
   and add them to the docs test's expected-route list.

No migration is required. No existing route changes behaviour. No new admin
surface or retention rule.

### 6.1 Errors

| HTTP | code | when |
|---|---|---|
| 400 | `bad_request` | empty/missing `product_id`, malformed `after` cursor |
| 400 | `bad_frame` | scoped push body malformed, or a frame's `product_id` is not the path scope; `index` names it |
| 401 | `unauthorized` | missing/unknown/revoked token |
| 413 | `payload_too_large` | push batch over 1000 frames or 1 MB |
| 415 | `unsupported_media_type` | wrong `Content-Type`/`Content-Encoding` |
| 500 | `internal` | server fault |

A product that does not exist is **not** an error on either route: the pull
returns an empty page and the push may create it.

---

## 7. Conformance checklist

### Server

- [ ] `GET /v2/product/one/pull/{id}` returns only rows whose `product_id` is
  `id`; `product` itself included; tombstones included; no `del`.
- [ ] Rows are ordered `product → product_name → property → listing → image →
  product_event`, then primary key ascending.
- [ ] Paging uses an opaque cursor; page 2 with `after` never repeats or skips a
  row that existed in the same snapshot.
- [ ] `limit` defaults to 5000, caps at 20000, and a non-positive/invalid value
  falls back to 5000.
- [ ] `done.more` is true iff another row exists above the cursor;
  `done.cursor` is null when `more` is false.
- [ ] The route allocates no `seq`, writes no log entry, and mutates no
  `sync_seq`.
- [ ] A product with no rows returns `{"t":"meta",...}`, `{"t":"done","s":0,
  "more":false,"cursor":null}`.
- [ ] `POST /v2/product/one/push/{id}` accepts a frame set for `id` and returns
  the same `applied`/`noop`/`stale` acks as `/v2/product/push`.
- [ ] A frame for another product is `400 bad_frame` with its `index`, and the
  whole batch is unapplied.
- [ ] An `applied` scoped push allocates a `seq` and appends one log entry per
  frame; a `noop`/`stale` appends none.
- [ ] A frame without `r.product_id` (i.e. a malformed frame) is `bad_frame`
  before the scope check.
- [ ] `GET /v2/product/image/manifest?product_id=…` returns only that product's
  current blobs; omitting the parameter is byte-identical to today's behaviour.
- [ ] Both new paths are in the OpenAPI document and in the route-set test.

### Client

- [ ] The scoped push selects only rows with `*_sync_at IS NULL AND product_id =
  P`, in the entity push order, within 1000 frames / 1 MB per request.
- [ ] Acks are applied with the same compare-and-set (`since` = uploaded clock)
  as the full push.
- [ ] The scoped pull merges each page with `mergePage` and **no bookmark
  commit**; `sync_bookmark` is unchanged before and after the whole operation.
- [ ] `done.s` is never stored as a bookmark.
- [ ] The client restarts from no cursor if a page's cursor is lost; it never
  constructs a cursor.
- [ ] The product service is refreshed after merge; `stocks` is rebuilt by the
  existing product branch when events arrive.
- [ ] Image upload/fetch passes are filtered by `product_id`; manifest calls
  pass `product_id`; conflict rules are unchanged.
- [ ] The run is refused while another sync is active, and refuses to start a
  full sync while it runs.
- [ ] Cancellation/failure leaves the local database in a state that the next
  run (scoped or full) converges from; nothing is deleted.

### Tests that must exist

Server:

- unit: cursor encode/decode round-trip; malformed cursor; page boundary across
  entities; a page that ends exactly on an entity boundary with more rows in the
  next entity; `more` false with an empty page; scope check by entity.
- integration: push one product + children + events through the scoped route,
  pull the snapshot back, assert the `product` group's normal pull also sees
  those rows and the counter moved; push a frame for another product → 400
  `bad_frame` and nothing applied; manifest filtered by `product_id` returns
  only that product.

Client:

- fake-server cycle: local dirty product + listing + event → scoped push →
  scoped pull from a second device state → second device sees them;
- scoped pull applies a newer server row, keeps a newer local row dirty, inserts
  a missing child, `noop`s an existing event;
- `sync_bookmark` is unchanged by the whole scoped cycle;
- scoped push rejects a batch with one out-of-scope frame on the fake server
  (mirror the server rule) without marking anything synced.

---

## 8. Non-guarantees

- It does **not** catch the device up on any other group.
- It does **not** pull the product's `record` rows. `record_id` may dangle
  before or after a scoped sync, exactly as the product contract allows.
- It does **not** guarantee that the *next* full product pull has nothing to do.
  The bookmark did not move; those rows will be re-delivered and no-op.
- It does **not** delete anything. Reconciliation is still "keep tombstones,
  never delete on a reset" (`SYNC-V2.md` §9.8, §13.4).
- It does **not** resolve a `409 blob_conflict` in the user's favour. The stored
  bytes win; the client's crop becomes a new edit with a new clock if the user
  still wants it.
- A row re-parented to another product is out of scope for the old product
  (§1.1).
- It does **not** turn the product detail page into a live subscription to the
  server. It is one manual action, like pressing the full sync button.
