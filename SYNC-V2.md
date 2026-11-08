# Kassir Sync v2 — complete contract

**Protocol:** 2 · **Groups:** money, customer, supplier, method, social, extra,
product, combo, record
**Status:** server and desktop implement every group, including the combo and
record aggregates; the image-byte side channel is implemented for product
images, with combo cover bytes still local-only
**Date:** 2026-11-03
**Revision:** the same contract plus the gaps closed in §0.6; retention is now
implemented (§15.1); image **bytes** now have a documented, server-implemented
side channel (§8.7.1)

> **What this revision changes.** It records the intentional no-backfill policy
> as a decision (§13.4), changes **one** behaviour — the reset on a pull
> `400`/`410` re-seeds by marking the group's synced rows dirty instead of
> discarding them (§9.8) — and implements retention: observed bookmarks, a
> lease, a per-group floor and `410` carrying that floor (§15.1).
>
> It also adds the **image-byte side channel** (§2.10, §8.7.1): `image` rows keep
> syncing through `product_group_change_log` exactly as before, while the bytes
> travel over three routes that are **not** the change log and spend **no**
> `seq`. Nothing about the row wire, the merge rules or the nine groups
> changes; a client that does not implement the side channel keeps showing
> placeholders and loses nothing. The server half is implemented; the desktop
> half is an open item (§15.6).
>
> **Combo component discounts.** The `combo` aggregate gained a third child set,
> `ch.combo_discounts` (§8.9): an ordered per-component discount stack, the same
> shape a sale line carries. It is a child of a child — a rule names its
> component (`combo_listing_id`), which names the combo — so nothing else about
> the wire, the merge rule or the group list changes; a rule whose component is
> not in the same aggregate is dropped rather than stored (§8.9). Desktop
> migration 59 and server migration 0022 add the table.

This is the consolidated reference for **all** of Kassir Sync v2. It combines
the shared protocol with the nine group contracts, the cross-group rules, the
client checklist, the server requirements, the rollout procedures, and the
operational surface.

The per-group files under `docs/SYNC-V2-<GROUP>.md` remain the detailed design
record for their group (rationale, history, worked examples). This document is
the current, self-contained statement of the implemented behaviour. Where a
group file and this file disagree, this file wins.

The dictionary blocks in §8 are data dictionaries, the `json`/`jsonl` blocks are
wire examples, and the `http` blocks are request examples. None of them is
implementation code. The pseudo-code blocks are sequences of decisions, not
code to paste.

Sections marked **⚠ NOT IMPLEMENTED** describe agreed behaviour that does not
exist yet. On the server there are none left: retention was the last one and is
implemented (§15.1). On the client, two halves are still pending — the record
aggregate (§15.3) and the image-byte side channel (§15.6) — and both are
tracked as open items rather than as gaps in this contract.

---

## Contents

- §0 How to read this (incl. §0.6 what this revision changes)
- §1 What v2 is
- §2 Protocol
- §3 Pull
- §4 Push
- §5 Merge
- §6 Deletion
- §7 Ordering and dependencies
- §8 Group reference: money, customer, supplier, method, social, extra, product, combo, record
- §9 Client state and cycles
- §10 Guarantees and non-guarantees
- §11 Client contract and conformance checklist
- §12 Server implementation requirements
- §13 Rollout and backfill
- §14 Operations
- §15 Open items
- §16 Appendices

---

## 0. How to read this

| if you are… | read |
| --- | --- |
| a desktop client developer | §0–§7, the relevant §8 group, §9, then §11 and §13 |
| a server developer / next agent | all of it; §12 is the server contract, §15 the open items |
| debugging a live device | §3.4 (resume), §4.5 (retries), §10 (guarantees), §16.2 (errors) |
| planning a rollout | §13 (backfill, full refresh) and §14 (operations) |
| reviewing a conflict | §5 (merge rules) and §7 (dependencies) |
| writing the client's test suite | §16.5 (conformance vectors), then §5–§9 |

The document is deliberately behaviour-first. It says what both sides must do
and what must be true afterwards; it does not prescribe an implementation.

### 0.1 The two sides

This contract is written for two implementers. Every rule below says which side
owns it.

| area | the server must | the client must |
| --- | --- | --- |
| transport | accept NDJSON, authenticate, decompress, enforce bounds | send NDJSON, the bearer token, and the correct headers |
| ordering | allocate a monotonic `seq` for every applied change | treat `seq` only as a bookmark; never infer it from a clock |
| push | apply a batch atomically and answer one ack per frame | send only dirty rows/records, in the right order and within the bounds |
| pull | take one snapshot and stream a contiguous range | commit the rows and the new bookmark in one transaction |
| merge | apply the same merge rule as the client at merge point B | apply the same rule at merge points A and C |
| acks | answer one per frame, in order, for the state it applied | apply an ack only to a row/record unchanged since it was sent (§4.12) |
| pause | keep no progress state; an abandoned request is a slow request | pause only at a commit boundary; resume is the normal cycle (§3.9) |
| deletion | treat a soft-deleted row as an ordinary row; never cascade across groups | soft-delete; never hard-delete a synced row/record |
| dependencies | never enforce a cross-group foreign key | tolerate dangling references; do not create cross-group hard FKs |
| record | write the header and all five child sets atomically | push and pull the whole aggregate; never sync a child alone |
| rollout | run the backfill or clear procedure for the group | reset the bookmark and dirty flags exactly as the group says |
| reset | keep no history it never had; `400`/`410` is the only signal it can give | re-seed on `400`/`410`: bookmark `0` or the floor, mark synced rows dirty, pull then push (§9.8) |
| seeding | keep no history it never had; after a counter reset the log is empty | seed a group with no backfill before the first pull (§13.4); seeding and the reset are the same operation |
| orphans | store a live child under a soft-deleted parent as it is; never cascade | hide it, keep it, never auto-delete it; restoring the parent brings it back (§6.6) |

If a sentence says "must" without naming a side, it applies to both sides.

### 0.2 Terms

| term | meaning |
| --- | --- |
| **group** | one independently synced unit: one log, one bookmark, one pull endpoint, one push endpoint |
| **log** | the server's append-only history of applied changes for one group |
| **seq** | the server's monotonic change number; the only ordering the protocol uses |
| **bookmark** | the highest seq the client has durably stored for one group |
| **dirty** | a row/record whose `*_sync_at` is `NULL`: it has local changes the server has not accepted |
| **synced** | a row/record whose `*_sync_at` is not `NULL`: it is already represented on the server |
| **applied** | the server stored the pushed frame and allocated a new seq |
| **noop** | the server already had exactly this row/aggregate; no seq was allocated |
| **stale** | the server's copy won; the ack carries the winner |
| **row frame** | one entity row: `{"e":"<entity>","r":{…}}` |
| **aggregate frame** | one record header plus its five child arrays: `{"e":"record","r":{…},"ch":{…}}` |
| **soft delete** | a row/record with `*_deleted_at` set; it is still a row, not a missing row |
| **hard delete** | physically removing a row; v2 does not do this for synced data |
| **LWW** | last-writer-wins on the entity's `*_updated_at`; a tie goes to the stored copy |
| **append-only** | insert if absent, `noop` if present; never update or delete |
| **merge point A** | the client merges a pulled row/aggregate into its local store |
| **merge point B** | the server decides a pushed frame against its stored row/aggregate |
| **merge point C** | the client applies the winner carried by a `stale` ack |
| **park** | hold a row that cannot be written yet (for example, money whose pocket is unknown) and retry it later |
| **backfill** | seed the log from existing server rows; only the product group has this today |
| **full refresh** | clear the server's group and re-push from the clients; the record group uses this |
| **seeding** | the client-side act of setting a group's bookmark to `0` and marking every row dirty so the device re-pushes its copy; the only way a group without backfill is populated (§13.4) |
| **orphan** | a live row whose parent row is soft-deleted (a live `money` under a deleted `pocket`, a live product child under a deleted product); kept, hidden, and reversible (§6.6) |
| **retention floor** | the lowest `seq` the server still serves; a bookmark below it answers `410` (§15.1) |

### 0.3 The contract in one page

These thirteen invariants are the whole protocol. Every later section is a
detail of one of them.

1. **One bookmark per group.** A bookmark is advanced only to `done.s`, and only
   with the data of that page committed.
2. **One transaction per page and per push batch.** A page's rows and its
   bookmark move together; a push batch lands entirely or not at all.
3. **The dirty flag is the only push selector.** `NULL` means "push me";
   anything else means "already on the server".
4. **Every real edit bumps the clock to a strictly greater value and marks the
   row/record dirty (`*_sync_at = NULL`)** in the same local transaction:
   `clock = max(now, previous + 1)` (§5.1.1). No edit, no bump.
5. **Send every column, with explicit `null`s.** Do not include `*_sync_at` or
   `sync_seq`; the server ignores them if present.
6. **Soft delete only.** A deleted row/record is an ordinary row with
   `*_deleted_at` set. Never hard-delete a synced row/record.
7. **No cross-group hard foreign keys on the client.** Cross-group references
   may dangle; a page must not fail because another group lags.
8. **Retry the whole batch.** Every frame is idempotent; a retry is `noop` or
   `stale`, never duplicate history.
9. **`stale` is the server's verdict.** Apply the returned winner; do not
   re-litigate the comparison.
10. **A record is one aggregate.** One header, five child arrays, one frame, one
    seq, one local transaction. Never sync a record child on its own.
11. **One cycle per group at a time.** A group has one bookmark, so two cycles
    running together could move it past data that is not committed (§9.11).
12. **An ack never overwrites a newer local edit.** Apply an ack only if the
    row/record still carries the clock that was pushed (§4.12).
13. **Image bytes are not rows.** An `image` row syncs through the log like any
    other catalog row; its bytes travel over a separate, content-addressed side
    channel that spends no `seq` and moves no bookmark, and the row's own
    `image_updated_at` decides which bytes are current (§2.10, §8.7.1).

### 0.4 What the server is responsible for

- Keeping the monotonic counter and the per-group history.
- Applying a push batch atomically, deciding applied/noop/stale, and answering
  one ack per frame in order.
- Taking one snapshot per pull response and streaming a contiguous, ordered
  range.
- Returning the winning row/aggregate in a `stale` ack.
- Never spending a seq or writing a log entry for a `noop`/`stale` frame.
- Storing the log payload as it stored the row/aggregate, so a re-read is
  reproducible.
- Rejecting malformed frames, bad bookmarks, bad media types and oversized
  batches with the documented codes.
- Not enforcing cross-group foreign keys and not inventing child tombstones.
- Never conjuring history: after a counter reset or a wipe the log is empty, and
  a pull from `0` returns nothing (§14.2).
- Storing image bytes content-addressed, bounded, outside the change log, and
  serving only the bytes of an image row's **current** `image_updated_at`
  (§8.7.1). An upload is never a `seq`, a log entry or a bookmark movement.

### 0.5 What the client is responsible for

- Keeping one bookmark per group and a dirty flag per synced row/aggregate.
- Selecting only dirty rows/records for a push, in the group's required order
  and within its bounds.
- Sending complete rows/aggregates with every column and explicit `null`s.
- Applying pull pages and push acks in the documented way, in one transaction
  per page/batch.
- Bumping `*_updated_at` and setting `*_sync_at = NULL` on every real local edit.
- Soft-deleting, never hard-deleting, and sending the required tombstones.
- Tolerating dangling cross-group references and never creating cross-group
  hard FKs.
- Handling `400`/`410` by re-seeding the group — bookmark `0` on a `400` and the
  returned `floor` on a `410`, every synced row marked dirty, nothing deleted —
  then pulling and pushing (§9.8).
- Running the group's rollout reset exactly (product bookmark, record full
  refresh).
- Seeding a group that has no backfill before its first v2 pull (§13.4), and
  re-seeding automatically on a `400`/`410` (§9.8).
- One sync cycle per group at a time (§9.11), with a strictly increasing clock
  per row (§5.1.1).
- Keeping a live child of a soft-deleted parent hidden and intact, never
  auto-deleting it (§6.6).
- Applying an ack only to the row/record it was sent for: a row edited while the
  batch was in flight stays dirty and is pushed again (§4.12).
- Pausing only at a commit boundary, and resuming with the normal cycle (§3.9).
- For image bytes: pushing the row **before** its bytes, uploading only for a
  version the server accepted, and fetching only what the manifest lists. A
  missing file is a placeholder, never a page failure and never a reason to
  stall the bookmark (§8.7.1).

### 0.6 What this revision changes

This revision does not change the wire, the merge rules or the group
dictionaries. It fills the gaps that the 2026-11-03 contract left implicit,
records the no-backfill policy as a decision rather than an omission, implements
retention (§15.1), and changes one behaviour: the reset on `400`/`410` (§9.8).

| change | where |
| --- | --- |
| no backfill for the six simple groups is **intentional**; the seeding procedure is normative | §13.4, §9.8, §14.2 |
| a server wipe is no longer a data-loss event: the log is empty, every client re-seeds on `400`, and the shop is re-uploaded from the devices | §14.2, §9.8, §10 |
| **the reset re-seeds instead of discarding** (the one behaviour change): keep the synced rows, mark them dirty, pull then push | §9.8, §3.3, §3.6, §11.3 |
| parent-delete vs. concurrent child-insert: keep the child as an orphan, hide it, never auto-delete it | §6.6, §6.1, §6.2, §6.5 |
| `record.record_cashier` is named as a permanently dangling reference | §1.5, §7.2 |
| the LWW clock must be strictly increasing per row (`max(now, stored + 1)`) | §5.1.1, §9.4, §5.6 |
| one sync cycle per group at a time; triggers coalesce | §9.11, §9.2, §11.1 |
| **retention is implemented**: observed bookmarks, a lease, a per-group floor, `<group>_group_change_log` pruning and `410` with the floor | §15.1, §3.6, §14.3, §14.6 |
| TLS, single-shop, token rotation, edge rate limiting, backup/restore and one-writer rules | §2.5, §14.6, §14.2 |
| a normative retry/backoff/timeout policy and `503` interop | §4.11, §16.2 |
| wire edge cases: final newline, blank lines, unknown lines/keys, empty bodies | §2.9, §2.2, §4.1 |
| pause/resume is a client-local state with defined pause points | §3.9, §9.13 |
| an ack may not overwrite a local edit made while the batch was in flight (compare-and-set) | §4.12, §4.4, §5.8, §9.4 |
| a single failure-point recovery matrix, mid-pull and mid-push | §9.12 |
| long-pause backlog catch-up, and what may change while paused | §9.13 |
| client conformance vectors: merge, pages, acks, clock, reset/retention | §16.5 |
| `record_flag` is opaque; client durability; a parked money row must be visible; `del` encoder note | §8.8, §9.4.1, §7.5, §2.3 |
| **image bytes get a side channel**: content-addressed objects, a manifest, `PUT`/`GET`/manifest routes, no `seq`, no log entry, no row-column change; the row's clock decides which bytes are served | §2.10, §8.7.1, §10, §12.7, §16.1, §16.2 |

---

## 1. What v2 is

The backend mirrors the desktop's transactional tables. The desktop is the
source of truth for its own data; the server is a durable meeting point so that
several tills in one shop converge.

**One server instance serves exactly one shop.** Tokens are not scoped to a
shop, a group or a role: any valid token reads and writes every group of that
instance. Pointing two shops at one server merges their ledgers irreversibly
(§14.6).

Every group has the same two directions:

```
pull   client asks "what changed after seq N"      → server streams changes
push   client sends rows/aggregates changed locally → server applies + acks
```

Nothing above that is shared: each group has its own change log, its own client
bookmark, its own endpoints, and its own merge rule.

### 1.1 The problem that shapes everything

If the server only stores the current version of each row, a pull is not
reproducible. A row is at seq 5 when a pull starts; it is edited and moves to
seq 9 while the bytes are still going out. A client cut off at byte 300 now asks
for "the same thing again" and gets a different stream. That is unfixable
without either buffering the whole response or keeping history.

A change log keeps history:

```
seq  entity   row_id  payload
 1   pocket   p_01    {"pocket_id":"p_01",…}
 2   money    m_01    {"money_id":"m_01","money_value":5000,…}
 3   money    m_01    {"money_id":"m_01","money_value":4000,…}   ← an edit, a NEW entry
```

Replaying `seq 1..2` returns the same bytes today that it returned yesterday.
That single property is what makes the rest of the design simple: no tickets,
no byte offsets, no hash chains, no in-memory buffers.

### 1.2 The two numbers

| number | lives where | means |
| --- | --- | --- |
| **`seq`** | server | the order of changes. Assigned when a change is applied. Never reused, never reordered |
| **bookmark** | client | the highest `seq` the client has **durably stored** |

There is no third number. In particular there is **no clock anywhere in the
protocol**: no `updated_at` decides what a client has already seen. `*_updated_at`
exists only to settle who wins when the same row arrives twice (§5).

The `seq` counter is shared by **every** group. A group's log contains
gaps: a seq allocated by another group is not in this group's log. The only
order a group promises is the order of its own log entries.

### 1.3 One group = one log + one bookmark

A group is the smallest unit a client syncs independently:

```
one log table        <group>_group_change_log
one client bookmark  <group>_bookmark
one pull endpoint    GET  /v2/<group>/pull/:seq
one push endpoint    POST /v2/<group>/push
```

A client may sync groups in any order. It must **never** share a bookmark
between groups: `money_bookmark` says nothing about the product log.

### 1.4 Group catalog

| group | entities | log table | merge | pull `limit` | push bound |
| --- | --- | --- | --- | --- | --- |
| `money` | `pocket`, `money` | `money_group_change_log` | pocket LWW; money insert/note/delete with immutable financial fields | 5000 / 20000 | 1000 frames / 1 MB |
| `customer` | `customer` | `customer_group_change_log` | plain LWW | 5000 / 20000 | 1000 / 1 MB |
| `supplier` | `supplier` | `supplier_group_change_log` | plain LWW | 5000 / 20000 | 1000 / 1 MB |
| `method` | `method` | `method_group_change_log` | plain LWW | 5000 / 20000 | 1000 / 1 MB |
| `social` | `social` | `social_group_change_log` | plain LWW | 5000 / 20000 | 1000 / 1 MB |
| `extra` | `extra` | `extra_group_change_log` | plain LWW | 5000 / 20000 | 1000 / 1 MB |
| `product` | `product`, `category`, `product_category`, `product_name`, `property`, `listing`, `image`, `product_event` | `product_group_change_log` | catalog LWW; event append-only | 5000 / 20000 | 1000 / 1 MB |
| `combo` | `combo` aggregate (header + `combo_listings`, `combo_extras`, `combo_discounts`) | `combo_group_change_log` | full LWW aggregate | 1000 / 5000 | 1000 frames / 8 MB |
| `record` | `record` aggregate (header + five child tables) | `record_group_change_log` | full LWW aggregate | 1000 / 5000 | 1000 frames / 8 MB |

`limit` is `default / maximum` entries. The record group additionally has an
8 MB pull-page payload budget (§3.5).

All nine groups use the same wire format, auth, compression, error codes and
pull/push cycle. The differences are the entities, the merge rule, the limits,
and—for record—the aggregate frame and the full-refresh rollout.

One group has a second, non-log channel: **`product` also serves image bytes**
over `PUT /v2/product/image/blob/:image_id`, `GET /v2/blob/:sha256` and
`GET /v2/product/image/manifest` (§2.10, §8.7.1). It has no bookmark, no `seq`
and no frames; it is part of the product group only because the `image` row that
addresses the bytes is.

### 1.5 What is not synced

Do not create a group, a frame or a dirty flag for these:

- `cashiers`, `cashier_roles` — per-device login accounts. `record.record_cashier`
  therefore always dangles on another device: it is an opaque display value, not
  a join (§7.2).
- `stocks` — derived locally from the `product_event` journal (§8.7).
- `tx_*` — transient cart working state.
- enum/vocabulary tables — static on both sides.
- `<name>_old`, `graves*` — migration residue.
- image **bytes** as *rows or frames* — they are not an entity, not a frame and
  not a group. They travel over the product group's side channel (§8.7.1), which
  is the one thing in v2 that is not a change log.
- `record_*` children — they travel inside the record aggregate, not as separate
  groups or frames.
- `tokens` and the admin/request-log data — server-side auth and operations, not
  sync data.

---

## 2. Protocol

### 2.1 Data model

The contract needs only three capabilities from the server, however it chooses
to store them:

1. **A monotonic counter.** Every change that is actually applied gets the next
   value; nothing is ever reused, skipped backwards or reordered.
2. **A history.** Every applied change is readable later in seq order, with the
   row/aggregate as it was at that moment, for an arbitrary
   `(bookmark, snapshot]` range.
3. **Current rows.** The latest state of each row/aggregate, so a push can
   decide applied/noop/stale.

Consequences the client may rely on:

- **No cross-group foreign keys.** A child may reference a row that has not
  arrived; §7 lists the allowed dangling references.
- **The server's bookkeeping never crosses the wire.** A row carries exactly
  its dictionary columns — never `sync_seq`, never the client's `*_sync_at`.
- **The history is not the current row.** A row that changes twice appears
  twice in the history and once in the current state.
- **The log payload is stored, not derived.** Re-reading the same `seq`
  returns the same bytes.

Each group's log is a sequence of entries. Each entry carries:

- **`seq`** — the monotonic number; the entry's position.
- **`entity`** — which entity the change belongs to (for record, always
  `record`).
- **`row_id`** — the primary key of the row; for record, the `record_id`.
- **`op`** — `put` for a row/aggregate that exists; `del` for a row that is
  gone. `del` is reserved; nothing produces one today.
- **`payload`** — the canonical JSON of the row/aggregate as it was stored. It
  is empty only for `del`.
- **`changed_at`** — the server's wall clock, for humans and retention. It never
  decides what a client has seen.

A `put` covers insert, update and soft delete (a soft-deleted row is a `put`
whose `*_deleted_at` is set). The server never updates a log entry, and only
retention pruning removes one (§15.1).

The entity rows keep their server-only `sync_seq`, set to the same value as the
log entry that wrote them. Children of a record aggregate do not carry a
`sync_seq`.

### 2.2 Wire format

Every request body and every response body is newline-delimited JSON:

- one JSON **object** per line
- UTF-8, terminated by exactly one `\n` (0x0A); no `\r`
- a line never contains a raw newline (JSON escaping covers it)
- responses are **streamed**: lines arrive progressively, there is no
  `Content-Length`

JSON values:

- integers are integers (`5000`), reals are reals (`5000.5`) — never quoted
- `null` is explicit for nullable columns
- timestamps are epoch **milliseconds**, integers
- every row carries every column of its dictionary; no column omitted

**Key order does not matter for correctness.** There is no hashing and no
byte-offset resume, so the server parses the JSON and re-serialises canonically.
A client may send objects in any key order and may include extra columns (they
are ignored).

The normative body is: every line, **including the last**, ends with exactly one
`\n`, and no line is empty. The server is tolerant on read — it ignores
whitespace-only lines and accepts a final line without `\n` — but a client must
not rely on that tolerance (§2.9).

### 2.3 Line and frame types

Every response line starts with `t`:

| `t` | direction | purpose |
| --- | --- | --- |
| `meta` | server → client | first line of a pull response |
| `row` | server → client | one change whose row exists |
| `ag` | server → client | one change whose **record aggregate** exists |
| `del` | server → client | one change whose row/record is gone (reserved) |
| `ack` | server → client | one frame of a push |
| `done` | server → client | last line of any response |
| *(none)* | client → server | push bodies are bare frames |

A **row frame** is:

```json
{"e":"customer","r":{"customer_id":"c_01",…}}
```

A **record aggregate frame** is:

```json
{"e":"record","r":{…20 header columns…},
 "ch":{"record_listings":[…],"record_methods":[…],"record_extras":[…],
       "record_images":[…],"discounts":[…]}}
```

Only `record` uses `ag` on the pull side and `ch` on the push side. All other
entities are one row per frame.

`del` exists in the encoders of every group so a future hard delete has a wire
form (see §6), but no group produces one today: a deletion is a soft-deleted
row/record and travels as `put`/`row`.

There is **no** `blob` line type and there never will be. Image bytes are not a
frame: base64 in a push body would cost 33% on the wire, defeat gzip on already
compressed images, and put megabytes of picture into a log that is pruned by
bookmark rather than by size. They travel as raw HTTP bodies on their own routes
(§2.10, §8.7.1).

### 2.4 Compression

| direction | how |
| --- | --- |
| pull | client sends `Accept-Encoding: gzip`; the server **may** answer `Content-Encoding: gzip`. Identity is always valid. The client must check the header before decompressing |
| push | client may send `Content-Encoding: gzip` on the request body. Only `identity` and `gzip` are accepted; anything else is `415` |

The server suppresses response compression when `DEV=true` (local development),
so a local server always answers identity. The record group's 8 MB push bound is
on the **uncompressed** body.

Image-byte routes are the exception: an upload is `identity` only (a gzip body is
`415`) and a download is served as-is, because a PNG/JPEG/WebP is already
compressed and re-encoding it would hide the byte count from the size bound
(§8.7.1).

### 2.5 Authentication

Both endpoints of every group — and all three image-byte routes — require a
**sync token**:

```http
Authorization: Bearer kst_<43 base64url chars>
```

- Tokens are created and revoked by an operator: `POST /v2/admin/tokens`,
  `DELETE /v2/admin/tokens/:id`.
- Only the SHA-256 digest is stored server-side; the raw token is shown once.
- Missing, unknown or revoked → `401 unauthorized`. Do not retry in a loop.
- The admin password is **not** accepted here.

`GET /v2/health` is the only public route.

**Credential and transport rules.** A sync token is a full read/write credential
for every group of the instance, so:

- **TLS is mandatory.** The client refuses a plain-`http` base URL except for a
  local `DEV` server; the server assumes a TLS-terminating proxy in front of it
  (§14.6). A token sent over plain HTTP is a leaked token.
- **One token per device,** labelled with the device name. Two devices sharing a
  token make revocation all-or-nothing.
- **Tokens do not expire.** There is no `expires_at`; rotation is manual: mint a
  new token, move the device, revoke the old one. A revoked token is refused
  immediately by the process that revoked it and within 60 s (the token-cache
  TTL) by any other.
- **Wrong credentials are cheap and unthrottled.** The server does not rate-limit
  `401` and does not rate-limit pulls; the edge (tunnel/WAF/proxy) must. A client
  never retries `401` (§4.11).
- **Tokens are not scoped.** There is no per-shop, per-group or read-only token.
  One instance = one shop (§14.6).

### 2.6 Error bodies

A non-`2xx` response is a JSON object, not NDJSON:

```json
{"error":{"code":"bad_frame","message":"frame 3: \"r.money_value\" must be a finite number","index":3}}
```

| field | meaning |
| --- | --- |
| `code` | stable, machine-readable — branch on this |
| `message` | human text — never parse it |
| `index` | only for `bad_frame` during a push: the 0-based frame index |
| `floor` | only for `too_old` on a pull: the lowest `seq` the group still serves; the client re-seeds from it (§9.8, §15.1) |

Full table: §16.2.

---

### 2.7 What the server must do in this section

- Accept only the documented wire shape; parse every line before applying.
- Re-serialise canonically; key order and extra client columns never affect the
  result.
- Authenticate every sync route; reject a missing, unknown or revoked token with
  `401`.
- Accept `identity` and `gzip`; reject any other coding with `415`.
- Return the documented error object with a stable `code`; a `bad_frame` carries
  the frame `index`.
- Never put server bookkeeping (`sync_seq`) on the wire.

### 2.8 What the client must do in this section

- Send NDJSON: one object per line, UTF-8, `\n`, no `\r`.
- Send every dictionary column of the entity/aggregate in every frame, with an
  explicit `null` for a nullable value.
- Send epoch milliseconds as integers and reals as JSON numbers, never quoted.
- Do not omit a nullable column: a missing nullable column is a `bad_frame`,
  because omitting `*_deleted_at` would resurrect a deleted row.
- Do not send `*_sync_at` or `sync_seq`; extra keys are ignored, but they are not
  part of the contract.
- Send `Authorization: Bearer kst_…` on every sync request.
- Send `Content-Type: application/x-ndjson` on push; use
  `Content-Encoding: gzip` only when the body is actually gzip.
- On pull, send `Accept-Encoding: gzip` only if the client can decompress; always
  handle an identity response.
- Branch on the error `code`, never on the message. Do not retry `401` in a loop.
- Check `GET /v2/health` once per session and require `protocol: 2` before
  calling a group route; if it answers anything else, the base URL points at a
  server this client does not speak to.

### 2.9 Wire edge cases

These are the cases that separate "works on my machine" from "works on a shop's
wifi".

| case | rule |
| --- | --- |
| final `\n` missing on a push body | accepted by the server; still a client bug — always terminate the last line |
| empty or whitespace-only line in a push body | ignored, not a frame, does not count toward the 1000-frame bound |
| `\r\n` line ending | the `\r` is trimmed with the whitespace and the line parses; still a client bug — send `\n` |
| an empty push body | `200` with `{"t":"done","frames":0}` |
| unknown key in `r` | ignored (§2.2) |
| unknown `e` in a push frame | `bad_frame` |
| an entity that belongs to another group | `bad_frame` — each route accepts its own entities only |
| a `t`-tagged line in a push body | `bad_frame` — push frames are bare |
| unknown `t` on a pull line | ignore the line and keep reading; never abort the page for it |
| a pull line for an entity this client does not know | ignore it, keep reading, bookmark still moves |
| `Content-Length` absent on a pull | normal: the response is streamed and has none |
| a response with `Content-Encoding` the client did not ask for | treat as a protocol error and stop (§2.4); only `identity` and `gzip` are legal |
| a `200` with a non-NDJSON body | treat as a proxy error; retry the request, do not parse it |

### 2.10 Image bytes are not frames

Everything in §2.1–§2.9 describes the **row** channels. The `product` group has
exactly one exception, and it is deliberately not a frame:

| | image **rows** | image **bytes** |
| --- | --- | --- |
| where | `product_group_change_log` | content-addressed objects beside it |
| transport | NDJSON `row` lines and bare push frames | raw HTTP bodies |
| ordering | `seq`, bookmark | none: the row's `image_updated_at` |
| conflict | plain LWW on `image_updated_at` | the row's LWW winner decides |
| costs a `seq` | yes | **no** |

Three routes, all on the sync token (§2.5):

```
PUT  /v2/product/image/blob/{image_id}?version={image_updated_at}   raw bytes up
GET  /v2/blob/{sha256}                                              raw bytes down
GET  /v2/product/image/manifest?after={image_id}&limit={n}          which hash is current
```

The rules that make it safe, in one place (the detail is §8.7.1):

1. **No `seq`, no log entry, no bookmark.** An upload is not a row change. The
   pull guarantee "same bookmark, same bytes" (§10, guarantee 2) stays literally
   true.
2. **The row is the address.** Bytes are accepted only for an `image_id` the
   server already has, so the client pushes **rows first, then bytes**.
3. **The row's clock decides the bytes.** A blob is stored under the
   `image_updated_at` it was produced for, and the manifest serves the blob whose
   version equals the row's current `image_updated_at`. A late upload from a
   device that lost LWW is stored, never served, and collected later.
4. **Bytes are a cache of the row.** Losing them costs a re-download, never data,
   so fetching never gates the bookmark.

## 3. Pull

### 3.1 Request

```http
GET /v2/<group>/pull/:seq?limit=5000
Authorization: Bearer kst_…
Accept-Encoding: gzip
```

| parameter | required | meaning |
| --- | --- | --- |
| `:seq` | yes | the client's bookmark: the highest `seq` it has **durably stored**. `0` on first sync |
| `limit` | no | maximum entries in this response. Below `1` falls back to the default; above the group's maximum is capped |
| `count` | no | `1` adds `count` to the `meta` line: how many entries this group has left in `(seq, snapshot]`. Asked for on the first page of a sequence only — it is an index scan of the whole remaining range, and it is the only way a client can size a pull |

The client never sends a snapshot. Only the response carries one.

The pull request is per group. `:seq` is that group's bookmark, not the global
counter, so **`count` is the only per-group figure on the wire**: `snapshot`
moves for every group, and a client that used it as a denominator would read a
group with three changes among five hundred seqs as 0% done.

### 3.2 Response

`200`, `Content-Type: application/x-ndjson`, `Cache-Control: no-store`, streamed.

```jsonl
{"t":"meta","snapshot":41,"count":2}
{"t":"row","s":38,"e":"pocket","r":{…}}
{"t":"row","s":39,"e":"money","r":{…}}
{"t":"done","s":39,"more":false}
```

| line | fields | meaning |
| --- | --- | --- |
| `meta` | `snapshot`, `count?` | `snapshot` = highest `seq` that existed when the response started. Always first. `count` = entries left in `(bookmark, snapshot]` for **this group**, present only when the request asked (`?count=1`) |
| `row` | `s`, `e`, `r` | `s` = seq of this change, `e` = entity, `r` = the row |
| `ag` | `s`, `e`, `r`, `ch` | record aggregate: `s` = seq, `e` = `"record"`, `r` = header, `ch` = five child arrays |
| `del` | `s`, `e`, `id` | row/record no longer exists; delete locally. **Reserved — nothing produces this today** |
| `done` | `s`, `more` | `s` = highest seq **actually sent** → the new bookmark. `more` = more changes exist above it |

Guarantees:

- lines arrive in **strictly increasing `s`**
- the response contains every change in `(bookmark, snapshot]`, or it stops
  early and says `more: true`
- **the same row/record may appear more than once** — once per change. Apply in
  order; the later one is the newer version.
- a soft-deleted row is an ordinary `row` with `*_deleted_at` set
- requesting the same bookmark twice returns **identical bytes** for the same
  entries, so re-asking is never harmful — provided the bookmark is at or above
  the group's retention floor (§15.1)

The `snapshot` is taken once, before the first entry is read, so the page cannot
grow while it is being written. Anything applied during the response gets a
higher seq and arrives on the next call.

### 3.3 Client algorithm

```
after = <that group's bookmark, or 0>

loop:
    response = GET /v2/<group>/pull/{after}?limit=<default>

    if response is 401 → stop, surface "device not authorised"
    if response is 400 → the bookmark is ahead of the server:
                         after = 0; mark SYNCED local rows/records dirty; continue
    if response is 410 → the bookmark is older than the server keeps:
                         after = 0; mark SYNCED local rows/records dirty; continue
    if response is 5xx → retry with backoff

    BEGIN LOCAL TRANSACTION
        for each line as it arrives:
            meta → remember snapshot (progress display only)
            row  → merge by §5 (merge point A)
            ag   → merge the record aggregate by §5.5 (merge point A)
            del  → delete the local row/record and (for record) its children
            done → last = done.s, more = done.more
        bookmark = last
    COMMIT

    if not more: break
```

Rules that are not optional:

- **Streaming**: merge as lines arrive; do not accumulate the whole page before
  doing anything.
- **One transaction per page**, not per row.
- **One aggregate, one local transaction**: a record header and its five child
  sets must succeed or fail together.
- **The bookmark moves only with committed data**, and only up to `done.s`. A
  bookmark ahead of the data is unrecoverable: those changes will never be
  asked for again.
- `done.s` is the bookmark, **not** `meta.snapshot`. A page can stop early
  (`more: true`); storing the snapshot would skip everything after `done.s`.
- **Never commit a page without a `done` line.** If the stream dies after some
  entries but before `done`, roll back; the bookmark does not move.

`more: true` may be followed by an empty page when the shared counter advanced
for another group. That is normal; do not treat an empty page as an error.

One rule is easy to miss and expensive to get wrong: **a reset (§3.6) never
deletes the client's copy of the group.** The bookmark goes back to `0`, every
synced row is marked dirty, and the next push re-uploads whatever the server is
missing. Deleting rows instead would lose the only copy of a group that has no
backfill (§9.8, §13.4).

### 3.4 Resume after a dropped connection

There is nothing to resume: ask again from the bookmark.

```
client at after=37
  → receives 38, 39, 40 … connection dies mid-stream
  → its transaction never committed, so after is still 37
client asks /v2/<group>/pull/37 again
  → server sends 38, 39, 40, 41, …    (a little overlap, harmless)
```

If the client had committed up to 40 before dying, it asks with 40 and gets 41
onward. Either way the answer is correct, because applying a change twice is a
no-op (§5).

### 3.5 The record byte budget

A record aggregate can be much larger than a row. `limit` alone does not bound a
page, so the record group also applies a **payload budget**:

- the server accumulates the stored `payload` size of the entries in seq order;
- it stops before adding an entry that would take the page over **8 MB**
  (8 × 1024 × 1024 bytes);
- it always includes **at least one** entry, so a single aggregate larger than
  the budget is sent alone (a page may exceed 8 MB by that one record);
- `done.s` is the last seq actually included;
- `more` is true **iff at least one record change exists in
  `(done.s, snapshot]`**.

A record larger than the **push** limit (§4.1) cannot be sent at all; the
desktop must cap record size and surface an error rather than silently losing
it.

### 3.6 Pull errors and reset

| HTTP | code | when | client action |
| --- | --- | --- | --- |
| `400` | `bad_request` | `:seq` not a non-negative integer, **or** `:seq` greater than the server's counter | the bookmark did not come from this server: re-seed the group (§9.8) |
| `401` | `unauthorized` | missing/unknown/revoked token | stop |
| `410` | `too_old` | bookmark below the group's retention floor; the body carries `floor` (§15.1) | re-seed from `floor` (§9.8) |
| `500` | `internal` | server fault | retry with backoff |

On a pull `400` or `410`, do this in **one local transaction**:

1. set the group's bookmark to `0` on a `400`, or to `floor` from the `410`
   body (§15.1) — `0` on a `410` would be below the floor and loop;
2. mark every local **synced** row/record (`*_sync_at IS NOT NULL`) dirty,
   including the children of a record: `*_sync_at = NULL`, content and clock
   untouched;
3. leave every **dirty** row/record (`*_sync_at IS NULL`) exactly as it is;
4. run a normal cycle: pull from `0`, then push (§9.2).

Nothing is deleted. The pull runs first, so every row the server already has is
merged and marked synced again (identical at merge point A), and the push
carries only what the server genuinely lacks or has an older version of. The
whole operation is therefore one bounded download plus a small, idempotent
upload — the same shape as the seeding procedure (§13.4), because it *is* that
procedure with a `400`/`410` as the trigger.

Why not delete the synced rows: the client cannot know which of them the server
still has, and the server cannot tell it — the log is the only server-side copy
(§0.4). Marking them dirty costs one idempotent push; deleting them can lose the
shop's only copy of a group that has no backfill (§13.4).

The one accepted cost is that a wipe or a restore is now recovered **from the
devices**, not from a backup: a row that existed only on the server is gone
(§10). A device that is moved to a *different* shop is not this path — its local
database is wiped explicitly by an operator (§14.6), because no pull response
can authorise uploading one shop's data into another.

---

### 3.7 What the server must do in this section

- Validate `:seq` as a non-negative integer; reject a bookmark ahead of the
  counter with `400`.
- Read the counter once before reading any entry; `meta.snapshot` is that value.
- Emit `meta` first, then entries in strictly increasing `seq` order, then
  `done`.
- Never send an entry with `seq > snapshot`.
- Send every change in `(bookmark, snapshot]`, or stop early with `more: true`.
- Set `done.s` to the last seq actually sent, never to the snapshot.
- Enforce the group's `limit` and, for record, the 8 MB payload budget; always
  include at least one entry.
- Return identical bytes for the same bookmark and server state.
- Return `401` for a bad token, `410` only below a group's retention floor (with
  the floor in the body), and `500` for a server fault.

### 3.8 What the client must do in this section

- Keep one persisted bookmark per group; never share it between groups.
- Send the bookmark as `:seq`; use `0` on first sync.
- Open one local transaction per page. Apply `row`/`ag` lines, apply `del`
  lines, then set the bookmark to `done.s`, then commit.
- Never commit a page without a `done` line.
- Never store `meta.snapshot` as the bookmark.
- Loop while `more` is true. A `more: true` page may be followed by an empty
  page; that is normal.
- Apply a repeated row/aggregate again; it is harmless.
- On `400`/`410`: in one local transaction, set the bookmark to 0 and mark
  every synced local row/record (and record children) dirty; keep dirty rows as
  they are; then pull from 0 and push (§9.8). Never delete a row here.
- On `401`: stop and surface "device not authorised".
- On `5xx`/network: retry with backoff.
- Pull before pushing (see §9.2), so pulled rows are not pushed back.
- For record: accept a page over 8 MB when it contains one oversized aggregate
  alone; do not reject it for exceeding the budget.
- For product: a page may carry `image` rows whose bytes are not on the server
  yet. Store the row, show a placeholder, and fetch after the page commits — the
  bookmark never waits for bytes (§8.7.1).

### 3.9 Pause, resume and interruption

The protocol has no session, no lease and no server-side "in progress" state
(§1.2, §4.1), so pausing sync is never a protocol event: the client stops
asking. What must be defined is **where** it may stop and what it must leave
behind.

**A pause is legal only at a commit boundary.** The two units are the pull page
and the push batch, and each is one local transaction (§0.3). So:

| the pause arrives… | what the client does |
| --- | --- |
| between requests | stop; nothing is open; state is already consistent |
| during a pull response | abandon the connection, roll back the page transaction; the bookmark does not move |
| after `done` was read, before the commit | finish the commit — the whole page is in hand and it is one transaction |
| during a push request, before any ack | abandon the connection; nothing local was opened. The server may still have committed; the next cycle re-sends and gets `noop`/`stale` (§4.5) |
| during the ack stream (record) | roll back the ack transaction; the server already committed, so a re-push is safe (§4.6) |
| during the ack commit | let it commit; a half-applied ack set is impossible (one transaction) |
| during the backoff wait (§4.11) | drop the wait; the rows are still dirty and are re-sent on resume |

Two rules override convenience:

- **Never commit a partial page.** No `done` line means no bookmark movement,
  even if 900 of 1000 lines were already merged (§3.3).
- **Never leave an ack transaction open across the pause.** Commit it or roll it
  back before going idle; the conditional skip of §4.12 happens *inside* that
  transaction.

**The paused state is three things**, all already persisted: the per-group
bookmark (the last committed `done.s`), the dirty flags, and the parked rows
(§7.5). A paused client has no half-applied page, no half-applied batch, no
in-memory retry queue, and nothing the server remembers. Killing the process is
equivalent to a pause at the nearest commit boundary (§9.4.1); there is nothing
to clean up on restart.

**Resume is the normal cycle**: pull → push → pull (§9.2). Pulling first matters
more after a pause than during steady state: the longer the gap, the more likely
another till holds newer rows, and a push-first resume turns that into a batch
of `stale` acks (§4.7).

**Pause is client-local.** The server is never told, never expects a resume
marker and never sends a "continue". An abandoned connection is
indistinguishable from a slow one, and both are correct.

What can change while paused — a revoked token, a wiped server, an expired
retention lease, a moved device clock, a new v2 group — is handled by the normal
paths on resume; §9.13 lists each with its path.

## 4. Push

### 4.1 Request

```http
POST /v2/<group>/push
Authorization: Bearer kst_…
Content-Type: application/x-ndjson
Content-Encoding: gzip            (optional)
```

```
{"e":"customer","r":{…}}
{"e":"record","r":{…},"ch":{…}}
```

| rule | detail |
| --- | --- |
| body | frames only: `{"e":"<entity>","r":{…}}`, or the record aggregate `{"e":"record","r":{…},"ch":{…}}`, one per line |
| what to send | rows/records whose `*_sync_at` is `NULL` — the ones this device changed and no other device knows about. Sending the dirty flag along is allowed and ignored |
| order | product group: parent before children, journal after product. Money: every pocket before any money that references it. Record: every frame is self-contained. Other groups: no dependency order |
| batch size | ≤ **1000 frames** and ≤ **1 MB** uncompressed, except record: ≤ **1000 frames** and ≤ **8 MB** |
| one record per frame | a record may not be split across frames or requests |
| duplicate ids | at most one frame per id; two frames for the same id are both acked and the later one wins. Legal, but always a client bug |
| line endings | every frame line ends with one `\n`, including the last; the server ignores whitespace-only lines and does not count them toward the bound (§2.9) |
| empty body | `200` with `{"t":"done","frames":0}` |
| `Content-Type` | `application/x-ndjson` required; anything else → `415` |
| state | none. No session, no upload id, no offset, no hash. Each request stands alone |

### 4.2 Batch atomicity

The whole batch is applied atomically: either every frame is applied, or—if the
request fails for any reason—none of it is.

- One transaction for the whole batch.
- Parsing and all `bad_frame` validation happen **before** the apply
  transaction.
- A `4xx`/`5xx` means nothing landed, so resending the batch is always correct.
- A frame that does not change anything writes **no** log entry and consumes
  **no** `seq`. This is the single most important rule in the push: a client
  that fails mid-sync re-pushes everything it did not get an ack for; if those
  re-pushes were logged, every other device would re-download them forever.

For every `applied` frame the server records **one** change carrying the row or
aggregate **as it is now stored**, not the bytes the client sent.

### 4.3 Decisions

Frames are considered in the order they were sent. A later frame for the same
id compares against what an earlier frame in the same batch decided (legal, but
always a client bug).

The decision depends on the entity's merge kind:

| kind | entities | rule |
| --- | --- | --- |
| plain LWW | `customer`, `supplier`, `method`, `social`, `extra`, the product catalog (`product`, `product_name`, `property`, `listing`, `image`) | new → `applied`; identical → `noop`; newer `*_updated_at` → `applied`; tie/older → `stale` |
| money pocket | `pocket` | plain LWW on `pocket_updated_at` |
| money ledger | `money` | new → `applied`; immutable field differs → `stale`; identical → `noop`; newer `money_updated_at` → `applied` (note + deleted flag); else `stale` |
| append-only | `product_event` | new id → `applied`; existing id → `noop` (payload not compared) |
| aggregate LWW | `record` | new → `applied`; identical aggregate → `noop`; newer `record_updated_at` → `applied` (header + all five children); tie/older → `stale` |
| aggregate LWW | `combo` | new → `applied`; identical aggregate → `noop`; newer `combo_updated_at` → `applied` (header + every child set); tie/older → `stale` |

A `noop` or `stale` frame writes nothing and spends no `seq`.

### 4.4 Acks

```jsonl
{"t":"ack","i":0,"e":"customer","s":"applied","seq":42}
{"t":"ack","i":1,"e":"customer","s":"noop","seq":43}
{"t":"ack","i":2,"e":"customer","s":"stale","seq":44,"row":{"customer_id":"c_02",…}}
{"t":"done","frames":3}
```

| field | meaning |
| --- | --- |
| `i` | 0-based frame index, in the order the client sent them; one ack per frame, same order |
| `e` | the entity (`"record"` for an aggregate) |
| `s` | `applied` \| `noop` \| `stale` |
| `seq` | the row's/record's current seq on the server |
| `row` | only for `stale`: the server's winning row (for record: the winning header) |
| `ch` | only for a record `stale`: the server's winning children |

| `s` | meaning | what the client does |
| --- | --- | --- |
| `applied` | stored; it is now at `seq` | set `*_sync_at = ack.seq` (for record: `record_sync_at`) |
| `noop` | the server already had exactly this row/aggregate; no new seq | set `*_sync_at = ack.seq` |
| `stale` | the server's copy is newer and won; `row`/`ch` is the winner | merge the returned row/aggregate by §5, set `*_sync_at = ack.seq` |

For a record `stale`, do **not** re-run the *comparison*: the server has
already adjudicated. Apply the returned aggregate as the winner — provided the
local aggregate has not changed since it was sent (§4.12).

`applied` and `noop` do not carry a row: the client already has its own version.

Ack application is **conditional**: a row the user edited while the batch was in
flight keeps its dirty flag instead of taking the ack's `seq`, and its `stale`
winner is not applied over the newer local edit (§4.12).

### 4.5 Retries and idempotency

Every frame is idempotent, in both directions:

| situation | result |
| --- | --- |
| ack lost, client re-pushes the same row/aggregate | `noop` or `stale`; no new seq, no new history |
| request failed after the server committed | client re-pushes → no new history; each frame is acked again |
| two devices push the same id | the newest clock wins; the loser gets `stale` with the winner |
| client pushes a row/record it just pulled | `noop` |

Because of this, **the client needs no retry bookkeeping at all**: resend the
batch, read the acks, move on.

### 4.6 Client algorithm

```
loop:
    batch = dirty rows/records for this group, ordered as §4.1 says,
            at most the group's frame/byte bound
    if batch is empty: break

    response = POST /v2/<group>/push  (body = batch)

    if 400 bad_frame → fix frame `index`; nothing landed; retry the batch
    if 413          → send a smaller batch (record: a single record over 8 MB
                      cannot be sent; surface it)
    if 415          → retry without Content-Encoding
    if 401          → stop
    if 5xx / network→ retry the same batch (with backoff)

    BEGIN LOCAL TRANSACTION
        for each ack as it arrives:
            if the local row/record changed since it was sent → skip (§4.12)
            applied/noop → *_sync_at = ack.seq
            stale        → merge ack.row (and ack.ch for record) by §5,
                           then *_sync_at = ack.seq
    COMMIT
```

For the record group, the ack body is streamed (§4.7): open the transaction
before reading the first ack and commit on `done`. If the stream dies, roll
back and retry the batch; the server already committed, so the retry is
`noop`/`stale` and is safe.

### 4.7 Memory and response size (record)

A record `stale` ack carries a whole aggregate, so a push response can be much
larger than the request. The server must not materialise the whole response:

- emit the acks after the commit, in frame order, one at a time, then `done`;
- do not keep every stored aggregate of the batch in memory; re-read one
  `stale` winner at a time if needed;
- the response has no `Content-Length`; the client reads acks as they arrive;
- a batch that is entirely `stale` is correct but expensive. It means the client
  pushed before pulling or its clock is far behind. Pull first (§9.2).

### 4.8 Push errors

| HTTP | code | when | client action |
| --- | --- | --- | --- |
| `400` | `bad_frame` + `index` | a line is invalid (see §8 per group). Nothing was applied | fix the frame at `index`, resend the batch |
| `401` | `unauthorized` | bad token | stop |
| `413` | `payload_too_large` | over the group's frame/byte bound | split the batch; a single record over 8 MB cannot be sent |
| `415` | `unsupported_media_type` | wrong `Content-Type`, or `Content-Encoding` not identity/gzip | correct the headers |
| `500` | `internal` | server fault; nothing committed | retry with backoff |

---

### 4.9 What the server must do in this section

- Check `Content-Encoding` and `Content-Type` before reading the body; return
  `415` for anything other than identity/gzip and `application/x-ndjson`.
- Enforce the group's frame and uncompressed-byte bound; return `413` before
  parsing.
- Parse and validate every line before the transaction; a `bad_frame` means
  nothing is applied.
- Apply the whole batch in one transaction. A `4xx`/`5xx` means nothing landed.
- Answer one ack per frame, in the same order, then `done`.
- Use the same merge rule as the client (merge point B).
- Spend no seq and write no log entry for `noop`/`stale`.
- Return the stored winning row/aggregate in a `stale` ack.
- For record: validate global child-primary-key ownership before writing;
  stream the acks one at a time.
- Never reject a frame because a cross-group reference is unknown.

### 4.10 What the client must do in this section

- Select only rows/records whose `*_sync_at` is `NULL`.
- Order the batch as the group requires: pockets before money; product parent
  before children and events after the product; record frames are
  self-contained; the simple groups have no order.
- Respect the bounds: 1000 frames and 1 MB for the simple/product groups; 1000
  frames and 8 MB for record. A record never splits across frames or requests.
- Send the whole row/aggregate: every column, every child array for record,
  including children of a soft-deleted record.
- Do not send `t` in a push body; push frames are bare frames.
- Do not send `*_sync_at` or `sync_seq`.
- Money: send every pocket before the money that references it.
- Product: send a product before its children and before its events. An
  `image` row's **bytes** are not frames: upload them after the batch is acked,
  and only for a version the server accepted (§8.7.1).
- Send at most one frame per id. Two frames for the same id are legal on the
  server but always a client bug.
- Never send a `del` frame. A deletion is a soft-deleted row/record; `del` is a
  server-to-client line only.
- Record: send at most one frame per record id, and never reuse a child primary
  key under another record.
- Apply the acks in order: `applied`/`noop` set the dirty flag to `ack.seq`;
  `stale` replaces the local row/aggregate with the returned winner and then
  sets the flag. An ack never overwrites a newer local edit (§4.12).
- **Never advance the group bookmark from a push ack.** Only a pull `done.s`
  moves the bookmark. Acks update dirty flags, not the bookmark.
- For record, open the ack transaction before reading and commit on `done`; if
  the stream dies, roll back and retry the batch.
- Retry a failed batch whole. Never try to resume mid-batch.
- On `400 bad_frame`, fix the frame at `index` and resend; nothing landed.
- On `413`, send a smaller batch; for record, surface a record that alone
  exceeds 8 MB.
- On `415`, correct the headers.
- On `401`, stop.
- On `5xx`/network, retry with backoff.

### 4.11 Retry, backoff and timeouts

Every request is idempotent (§4.5), so the retry rule is uniform and the client
needs no bookkeeping. This subsection fixes the numbers so two clients do not
invent two policies.

| outcome | retry? | what the client does |
| --- | --- | --- |
| `2xx` | no | continue |
| `400 bad_request` (pull) | no | reset the group (§9.8) |
| `400 bad_frame` (push) | yes, once fixed | fix the frame at `index`, resend the **whole** batch |
| `401` | **never** in a loop | stop every group and surface "device not authorised" |
| `404` | no | wrong base URL or group path — a configuration bug, not a retry |
| `410` | no | reset the group (§9.8) |
| `413` | yes, smaller | split the batch; a record over 8 MB alone is unsyncable |
| `415` | yes, once fixed | correct `Content-Type`/`Content-Encoding`, resend |
| `5xx`, or `503` from a proxy | yes | the same batch (or the same pull), with backoff |
| network error, timeout, aborted stream | yes | the same batch, or the pull from the current bookmark |

Backoff (normative):

- exponential with **full jitter**: `delay = random(0, min(cap, base * 2^attempt))`
  with `base = 1 s` and `cap = 60 s`;
- reset `attempt` on any `2xx`;
- honour `Retry-After` when present (seconds or an HTTP date), capped at 5
  minutes;
- no attempt limit while the app is running: the batch is idempotent, so a till
  that is offline for a day converges on reconnect;
- a `5xx` is never a reason to shrink the batch, and never a reason to drop it;
- never re-send a batch whose acks were already applied — the next cycle selects
  from the dirty set, not from a retry queue.

Timeouts:

- a pull may stream for a long time: the read timeout must be **≥ 120 s**, and
  an idle stream tolerated for **≥ 60 s** (an 8 MB record page is normal, and a
  proxy may buffer it);
- a push response can be **larger** than the request (record `stale` acks carry
  whole aggregates), so the response timeout must match the pull timeout;
- on a timeout or a dropped stream, discard the partial page/ack transaction and
  retry from the current bookmark; never commit a partial page;
- `500 internal` can also mean the server's SQLite writer was busy
  (`busy_timeout = 5 s`). Nothing landed; the retry is safe.

There is no `Retry-After` today and no `503` emitted by this server (§16.2); the
policy above is what the client does when a proxy or a future server sends one.

A **pause** (§3.9) ends the backoff loop: the pending batch stays dirty, and on
resume the attempt counter starts fresh rather than remembering the old delay.

### 4.12 Applying acks to a row the user just changed

An ack describes the row **as it was when the frame was sent**. Between the send
and the ack the user can edit the same row again. Applying the ack blindly then
produces the one silent data-loss path left in the protocol:

```
t0  R is dirty at clock 100 → selected into the batch → POST /push
t1  user edits R            → clock 101, *_sync_at = NULL   (dirty again)
t2  ack applied(seq 42)     → *_sync_at = 42                 ← the 101 edit is
                               now "synced" and is never pushed
t3  …or ack stale(row)      → the local row is replaced      ← the 101 edit is
                               destroyed
```

This is the normal case, not a rare one: a till keeps taking input while a push
is in flight, and a large record batch can be in flight for seconds.

**The rule (merge point C): apply an ack only to a row/record that is unchanged
since it was selected.**

```
applyAck(ack, sentClock):
    local = local row/record for ack.e (mapped by ack.i)
    if local is absent                     → ignore the ack
    if local.clock != sentClock            → skip: leave *_sync_at as it is
    else if ack.status is stale:
        replace local with ack.row (and ack.ch for record)
        *_sync_at = ack.seq
    else                                    → *_sync_at = ack.seq
```

Consequences, all intended:

- a skipped ack leaves the row dirty, so the **next** cycle sends the newer
  version; the server compares it by LWW and answers with a fresh ack. One extra
  round trip, never a lost edit;
- a skipped `stale` does not lose the server's winner: the re-push produces a
  new `stale` once the local row stops changing, and *that* ack applies;
- the comparison is on the row's **own clock**, not on `seq`. `seq` says nothing
  about whether the user has typed since;
- for record, compare the **header's** `record_updated_at`: a child edit bumps
  the header, so it is covered;
- `product_event` has no clock and is append-only (§5.3), so there is nothing to
  compare and nothing to lose: its acks apply unconditionally;
- a soft delete between send and ack is just another edit — it bumped the clock,
  so the ack is skipped and the tombstone is pushed instead.

**The client must keep the mapping the ack does not carry.** An ack has `i`,
`e`, `s`, `seq` and (for `stale`) `row` — but **no row id** (§4.4). The client
retains `index → (entity, id, sentClock)` for the in-flight batch until `done`
and applies acks from that map. A retried batch re-derives it, so acks are never
applied to a stale plan.

**Still one transaction.** Every ack of the batch is applied in the single
transaction opened before the first ack and committed on `done` (§4.6). The
check runs inside it, against the *current* local row — not against a snapshot
taken when the batch was built.

## 5. Merge

There is one merge rule per merge kind, applied in three places:

| point | where | `incoming` | `stored` |
| --- | --- | --- | --- |
| **A** | client, after a pull | the pulled row/aggregate | the local row/aggregate |
| **B** | server, during a push | the pushed frame | the server row/aggregate |
| **C** | client, after a push | the `stale` ack's `row`/`ch` | the local row/aggregate |

A and B run the rule themselves. At C the server has already run it, so the
client applies the server's row/aggregate as the winner. No side is allowed its
own interpretation.

### 5.1 Comparison rules

- Compare **parsed values**, not JSON text. Formatting and key order never
  affect the decision.
- Numbers compare by numeric value: `5000` and `5000.0` are equal.
- `null` and `""` are **different** values.
- Extra keys are ignored.
- Ties go to the stored copy.

#### 5.1.1 The clock must be strictly increasing per row (normative)

LWW compares with `>`, so an incoming value equal to the stored one loses. A
client that writes plain `Date.now()` on every edit therefore loses the edit
whenever the new value equals the stored one — two edits in the same
millisecond, or an edit right after pulling a row whose clock is already "now".

The client writes:

```
clock = max(Date.now(), stored.<entity>_updated_at + 1)
```

- computed **per row**, never from a shared counter;
- only when at least one column actually changed (§9.4);
- never on a pull merge, on an ack, or on a seeding pass (§13.4);
- for record, against the **header's** `record_updated_at`, because a child edit
  bumps the header.

A value that is already ahead of the device clock (written by a device with a
fast clock) is therefore beaten by exactly one millisecond on the next local
edit. That is what lets a local edit win without trusting the clock, and it is
the only rule needed to make the common case of "two edits in one millisecond"
deterministic. A clock that is *days* ahead is a different problem and is not
solved by this rule (§5.6).

### 5.2 Plain LWW

Used by `pocket`, `customer`, `supplier`, `method`, `social`, `extra`, and every
product catalog entity.

```
stored == null                                            → applied (insert)
sameRow(incoming, stored)                                 → noop
incoming.<entity>_updated_at > stored.<entity>_updated_at → applied (all columns)
otherwise (tie or older)                                  → stale (stored wins)
```

- Every column is editable.
- A soft-deleted row is an ordinary row: `*_deleted_at` set means hidden, not
  missing; it merges by the same rule.
- A newer clock replaces the whole row.
- A tie goes to the stored copy.
- The clock comes from the device. A device whose clock is behind can lose an
  edit to the server's copy; it sees a `stale` ack carrying the winner, so the
  divergence is visible, not silent.
- The clock the client writes is `max(now, stored + 1)` (§5.1.1), so a local
  edit never ties with the value it replaces.
- An `image` row is LWW like the rest of the catalog, and its bytes follow the
  same decision: the winning `image_updated_at` is the version whose blob the
  manifest serves. There is no second clock and no second conflict rule — a
  losing device's upload is stored and never served (§8.7.1).

### 5.3 Append-only (`product_event`)

```
stored == null → applied (insert, allocate seq, append one log entry)
stored != null → noop    (the id is already recorded; payload not compared)
```

An event is never updated or deleted. A correction is a **new event** with a
new id and the opposite `product_event_value` / capital. A duplicate event id
with a different payload is a client bug; the server does not reconcile it.

### 5.4 Money: insert, note, soft delete; never re-price

`money` has immutable financial fields: `timestamp`, `money_value` and
`pocket_id`. Once recorded, an amount is a fact; a later push must not rewrite
it. The note and the soft-delete flag are the only fields that follow the clock.

```
stored == null                                            → applied (insert)
timestamp / money_value / pocket_id differ from stored    → stale (stored wins)
sameRow(incoming, stored)                                 → noop
incoming.money_updated_at > stored.money_updated_at       → applied (note + deleted_at)
otherwise                                                 → stale (stored wins)
```

On `applied`, the stored row is the server's immutable columns plus the accepted
`money_note` and `money_deleted_at`. A buggy device that changes an amount gets
`stale` with the server's row and repairs itself; the ledger does not change.

`pocket` itself is plain LWW.

### 5.5 Record aggregate: full LWW

The record group's unit is the whole aggregate: the 20-column header plus all
five child sets. A record is a historical snapshot and the desktop is responsible
for not rewriting financial fields after creation (§8.8). The agreed protocol
rule is full LWW on `record_updated_at`, so a strictly newer
aggregate replaces the whole record.

```
stored == null                                            → applied (insert)
sameAggregate(incoming, storedHeader, storedChildren)     → noop
incoming.record_updated_at > stored.record_updated_at     → applied
                                                            (header + all five child sets)
otherwise (tie or older)                                  → stale (stored wins)
```

`sameAggregate` compares:

1. every header column by parsed value, and
2. for each of the five child tables, the rows as a **set keyed by primary
   key**: same row count, every primary key present on both sides, every child
   dictionary column equal.

Child array **order is not semantic**. A child omitted from the winning frame
is deleted: the children are replaced wholesale, not merged.

A record `stale` ack carries the full winning aggregate (`row` + `ch`). The
client applies it as the winner — without re-running the comparison — provided
the local aggregate still carries the clock that was sent (§4.12).

### 5.6 The clock caveat

`*_updated_at` comes from the device's clock, so a device whose clock is behind
can lose an edit to the server's copy. That is acceptable because the clock
never decides *what a client has already seen* — only who wins a tie. When it
goes wrong, it is visible as a `stale` ack with the winner in it.

A device whose clock is far ahead wins until the others catch up. The protocol
does not fix this; keep device clocks sane.

The strictly-increasing rule (§5.1.1) closes the *small* version of this
problem — the same-millisecond tie — but not the *large* one: a clock that is
days ahead makes every later edit lose. Two observability measures are allowed
and neither changes the wire: the server may record `changed_at` and flag, **in
the request log only**, a frame whose `*_updated_at` is more than a few minutes
in the future (it does not do this today), and the desktop may warn when the OS
clock is behind the last server time it saw (`Date` header or `changed_at`).
Do **not** reject or clamp a clock on either side: that would make the two
devices disagree about who won, which is worse than a visible skew.

For record, a **dirty** local record with an older clock loses its local edits
when a newer server aggregate is pulled: merge point A replaces the aggregate and
marks it synced. That is LWW, not a bug. Sync often enough that the window is
small; a correction is a new record, not an in-place edit racing another till.

---

### 5.7 What the server must do in this section

- Run the same comparison at merge point B that the client runs at merge point A.
- Compare parsed values, not JSON text.
- Treat a tie as the stored copy winning.
- For money, compare the immutable fields before the clock; a changed amount,
  timestamp or pocket is `stale`.
- For `product_event`, insert if absent and `noop` if present; never update.
- For record, compare the whole aggregate (header + five child sets) and replace
  the whole aggregate when the incoming clock is newer.
- Return the winner in a `stale` ack, including `ch` for record.

### 5.8 What the client must do in this section

- Run the same comparison at merge point A (after a pull) and merge point C
  (after a `stale` ack).
- At merge point A: if the incoming row/aggregate is newer, replace the local
  row/aggregate and set the dirty flag to `s`; if identical, set the dirty flag
  to `s`; if the local row/aggregate is newer, keep it and leave its dirty flag
  unchanged.
- At merge point C: apply the returned winner, then set the dirty flag to
  `ack.seq` — but only if the local row/record still carries the clock that was
  sent. Do not re-run the comparison. If the row changed since it was sent, skip
  the ack and let the next push decide (§4.12).
- A pull merge writes the row/aggregate **exactly as received**. It does not
  bump `*_updated_at`, does not change any content, and does not re-stamp the
  clock. A pulled row is already the server's version.
- A push `applied`/`noop` ack changes only the dirty flag. It does not change
  the row content or the clock.
- For `image`, a pull merge replaces the seven wire columns and leaves the
  client-only blob columns (`image_blob_version`, `image_blob_sha256`,
  `image_blob_sync_at`) alone — exactly like the dirty flag. A merge that wiped
  them would re-download every image on every pull (§8.7.1).
- Compare parsed values; a number compares by value; `null` and `""` are
  different.
- Treat a soft-deleted row/record as an ordinary row/aggregate.
- For record: compare child arrays as sets keyed by primary key; array order is
  not semantic.
- Never use the clock to decide what has already been seen; it only decides ties.

## 6. Deletion

Everything is a **soft delete**. A deleted row is a row with `*_deleted_at` set
to a timestamp, and a new `*_updated_at` computed by the strictly-increasing
clock rule (§5.1.1) — the two are usually the same value, but the clock is what
must be greater than the stored one:

```json
{"e":"money","r":{"money_id":"m_01",…,"money_deleted_at":1762000123000}}
```

It travels as a normal change and merges by the normal rule. Every read path
filters `WHERE *_deleted_at IS NULL`.

A **record** soft delete is an ordinary aggregate with `record_deleted_at` set;
it still carries its children, because they are the historical snapshot.

Never hard-delete a synced row/record locally. A row removed outright has no way
to be represented on the wire, so other devices keep it forever and the server
keeps it too — a permanent divergence.

`del` lines are reserved. If a row is ever removed outright, the only honest
representation is:

```json
{"t":"del","s":42,"e":"money","id":"m_02"}
```

Nothing produces one today. A client should apply it (delete the local row and
children, then continue) rather than crash.

### 6.1 Deleting a pocket

Deleting a pocket must soft-delete it **and** every money row under it, in one
local transaction: set `*_deleted_at` and `*_updated_at` to the same timestamp
(the §5.1.1 clock value, so it is strictly newer than the stored one)
and set `*_sync_at = NULL`, so both the pocket and its money rows get pushed.

Never physically delete the money rows. The server has no cascade; it does not
know the pocket was deleted. The desktop's `ON DELETE CASCADE` makes a hard
delete silently destroy the ledger.

**Restoring a pocket.** Set `pocket_deleted_at = null` with a newer
`pocket_updated_at` and `pocket_sync_at = NULL`. Restoring does **not**
un-delete the money rows that the delete tombstoned — each of those is an
independent ledger fact and may have been deleted on its own. A client that
wants a wholesale restore may additionally restore the money rows whose
`money_deleted_at` equals the pocket's old `pocket_deleted_at`, each with a
newer `money_updated_at` and `money_sync_at = NULL`; that choice is the
client's, not the protocol's. Money rows created by another device **after**
the delete were never tombstoned, so they become visible again automatically
(§6.6).

### 6.2 Deleting a product

The server has no cascade. The client that deletes a product must, in the same
push batch:

1. set `product_deleted_at` on the product;
2. set `*_deleted_at` on every live child (`product_name`, `property`,
   `listing`, `image`);
3. leave the events alone.

Events are audit and stock history. A stock correction is a new event, not a
deletion.

Deleting an `image` row stops its bytes from being served: the manifest lists
live rows only, so the tombstone is enough and no blob call is needed (§8.7.1).
Restoring the row is a new `image_updated_at`, which is a new version — the
restoring device uploads the file and the others fetch it. The server's
collector removes the old bytes after its grace window (§12.7).

The cascade above covers the children the deleting device knows about. A child
created on another device while it was offline is not covered, and the protocol
does **not** delete it: it stays live, hidden behind the deleted product, and
reappears if the product is restored (§6.6).

### 6.3 Deleting a record

Set `record_deleted_at` and `record_updated_at` to the same timestamp (the
§5.1.1 clock value, so it is strictly newer than the stored one), set
`record_sync_at = NULL`, and push the whole aggregate. Keep every child row.
Restoring sets `record_deleted_at = null` with a newer `record_updated_at`.

Removing a line item from an existing record is not a supported workflow: the
aggregate is the fact. Create a correction record and soft-delete the original.

---

### 6.4 What the server must do in this section

- Treat a soft-deleted row/record as an ordinary `put`; it is pulled and pushed
  like any other row/aggregate.
- Never cascade a delete across groups. The server does not know that deleting a
  pocket should affect money, or that deleting a product should affect its
  children.
- Never hard-delete a synced row. The `del` frame is reserved; nothing produces
  one today.
- If a `del` ever exists, send it per row/record; do not invent child deletes.

### 6.5 What the client must do in this section

- Soft-delete: set `*_deleted_at` and `*_updated_at` to the same timestamp (the
  §5.1.1 clock value), set `*_sync_at = NULL` (dirty), and keep the row/record.
- Money: deleting a pocket soft-deletes every money row under it in the same
  local transaction, and sets their dirty flags to `NULL` so they are pushed.
- Product: deleting a product soft-deletes it and every live child in the same
  push batch; leave the events alone.
- Record: deleting a record sets `record_deleted_at` and `record_updated_at`,
  keeps all children, and pushes the whole aggregate.
- Never hard-delete a synced row/record/child.
- If a `del` line is ever received, delete the local row/record and its children
  and do not re-push it.
- Keep a live child of a soft-deleted parent: hide it from live views, leave it
  live and synced, never tombstone it automatically (§6.6).

### 6.6 A deleted parent and a concurrently created child

The server has no cascade (§6.4), so this state is reachable:

```
A deletes pocket P  → pushes P and every money row A knew about, all soft-deleted
B was offline       → creates money row M under P, pushes M (live)
server              → P deleted, M live — it has no way to see the conflict
```

The same shape exists for a product and a child (`product_name`, `property`,
`listing`, `image`) created concurrently with the product's delete.

**The rule (normative, both sides): an orphan is retained, hidden, and
reversible.**

- **Retained.** A row is tombstoned only by the device that deletes it (or by
  that device's own cascade at delete time, §6.1/§6.2). No row is ever deleted
  on another device's behalf: it is never destroyed because its parent was
  deleted somewhere else. `money` is a financial fact and a product child is
  another device's work. No repair pass, no extra seq, no new frame type.
- **Hidden.** A `money` row whose `pocket` is soft-deleted is not shown in live
  views; a product child whose `product` is soft-deleted is not shown. Visibility
  is computed at read time. Nothing is deleted at merge time.
- **Counted.** A hidden `money` row still counts in ledger totals and reports:
  the cash moved. Hiding it is a display decision, not an accounting one.
- **Reversible.** Restoring the parent makes its retained children visible
  again. Children tombstoned by the delete itself stay deleted (§6.1, §6.2).
- **Resolvable by the user.** If the user wants an orphan gone, that is an
  explicit soft delete of that row — a real change, pushed like any other.

Why this and not "the parent delete wins": both sides converge without a
cascade and without a repair write, and no device can destroy another device's
financial record by deleting a pocket. Only the deleting device's own rows are
tombstoned, which is exactly what §6.1/§6.2 already describe.

**Events are not orphans.** `product_event` is append-only audit (§5.3, §8.7);
an event under a deleted product stays, is never hidden by this rule, and is
never soft-deleted.

**Records are not affected.** The record group is a whole-aggregate LWW (§5.5);
there is no parent/child state to get out of step.

## 7. Ordering and dependencies

### 7.1 Within a group

- The log is ordered by `seq`; within one response, `s` is strictly increasing.
- The server appends in the order it applies frames. A push that follows the
  recommended order keeps parent-before-child in the log.
- Two concurrent pushes can still interleave; a pull may deliver a child before
  its parent. The client must tolerate that.

Recommended push order:

| group | order |
| --- | --- |
| `money` | every `pocket` before the `money` rows that reference it |
| `product` | `product` → `category` → `product_category` → `product_name` → `property` → `listing` → `image` → `product_event` |
| `combo` | `combo_listings`, `combo_extras` and `combo_discounts` travel inside the header aggregate; no standalone `combo_id` in a child |
| `record` | no dependency order inside the group; each frame is a complete aggregate |
| all others | no dependency order |

Image **bytes** are not in that order because they are not frames. The only
ordering rule across the two channels is **rows before bytes**: an upload is
refused with `404 image_unknown` until the `image` row exists, so a client that
pushes rows first can never get stuck (§8.7.1).

### 7.2 Cross-group references

The server does not enforce any cross-group foreign key. These references may
dangle, and a pull may deliver them in either order:

| source | target | notes |
| --- | --- | --- |
| `money.pocket_id` | `pocket` | same group; the server has no FK, so a money row may arrive before its pocket |
| `product_names.product_id`, `properties.product_id`, `listings.product_id`, `images.product_id` | `product` | same group; child may precede parent after concurrent pushes |
| `product_category.product_id` | `product` | same group; a link may arrive before its product |
| `product_category.category_id` | `category` | same group; a link may arrive before its category |
| `product_events.product_id` | `product` | same group; event may precede product |
| `product_events.record_id` | `record` | cross-group; may arrive before the record |
| `record_listings.product_id` | `product` | cross-group; may dangle |
| `record_listings.product_event_id` | `product_event` | cross-group; may dangle |
| `record_methods.method_id` | `method` | cross-group; may dangle |
| `record_supplier_id` | `supplier` | cross-group; may dangle |
| `record_pair_id` | `record` | self/other record; may dangle |
| `record_cashier` | `cashiers` | **never synced** (§1.5): the target does not exist on another device at all, so this reference always dangles |
| `discounts.record_listing_id` | `record_listings` | intra-aggregate; tolerated even if the listing is absent |

The client must **never** enforce a hard foreign key on a cross-group reference.
A page must not fail because another group's bookmark lags.

`record_cashier` is the extreme case: `cashiers` is never synced, so the id is
an **opaque display value**. Store it, show it, never join on it. When the
client cannot resolve it against its own `cashiers` table, it displays the raw
value — never a blank and never an error. The same applies to `stock_id`
(§8.7).

Two references are not dangling but *soft-deleted*: a `money.pocket_id` or a
product child's `product_id` may point at a row that is still pulled and stored
but has `*_deleted_at` set. That is an orphan, not a missing row; it is kept and
hidden, never deleted (§6.6).

The only safe foreign key is a record child's `record_id` → `records(record_id)`,
because the header lands first in the same transaction. Even that is best made
deferrable or omitted.

### 7.3 Record child primary keys

A child primary key (`record_listing_id`, `record_method_id`, `record_extra_id`,
`record_image_id`, `discount_id`) is **globally unique** across its table, not
just within one record.

- The same key twice inside one aggregate is `bad_frame`.
- A key already owned by a **different** `record_id` is `bad_frame`, and nothing
  in the batch is applied.
- The server must not silently move a child to a new record: that would mutate
  another record and its history without a log entry for it.

### 7.4 Product child order and dangling children

The product pull is in `seq` order. After concurrent pushes, a child can precede
its parent. The client must tolerate a dangling `product_id` for a page:

- `PRAGMA defer_foreign_keys = ON` for the page transaction, or
- a bounded `pending_product_children` table applied after the parent arrives.

Do not drop the child and do not fail the page. The parent will arrive.

### 7.5 Money with an unknown pocket

The client's `money.pocket_id` may be a hard FK; the server's is not. A money row
whose pocket is absent must not fail the page:

1. write every pocket line first (they keep their seq order);
2. then write every money line;
3. if a money row's pocket is still unknown, park it (a `pending_money` table or
   a persisted in-memory list);
4. at the start of every page, retry the parked rows; drop one only when it was
   written successfully.

Never drop a money row and never abort the page for this reason.

A parked row is a visible state, not a silent one: it is counted in a
"pending" figure the user or support can see, and it is retried on every page
and every cycle. If the pocket never arrives (the device holding it is gone),
the row is still not deleted — surface it and let a human decide. A money row
must never disappear because another group lagged.

The sibling case is different and needs no parking: the pocket exists but is
**soft-deleted**. The money row is written normally and becomes an orphan
(§6.6).

---

### 7.6 What the server must do in this section

- Preserve the order frames were sent in within one batch.
- Not enforce a cross-group foreign key.
- Not reorder a pull page; the log's `seq` order is the only order.
- Allow a child to be stored before its parent.
- For record, reject a child primary key owned by a different record; do not
  move it silently.

### 7.7 What the client must do in this section

- Tolerate any cross-group reference being absent for a page.
- Never create a hard cross-group FK on the client.
- Make a product child's `product_id` deferrable, or check it after the page.
- Park a money row whose pocket is still unknown; never drop it and never fail
  the page. Surface the parked count.
- Keep a money row whose pocket is soft-deleted: it is an orphan, hidden and
  still counted, never deleted (§6.6).
- Treat record child primary keys as globally unique; never reuse one under a
  different record.
- Treat record child array order as non-semantic; sort for display explicitly if
  needed.
- Push in the recommended order so the log usually has parent before child, but
  do not rely on order for correctness.

## 8. Group reference

Each section gives the endpoints, the client table/bucket, the column
dictionary, the merge rule, the limits, and the group-specific notes. The
protocol in §2–§7 applies to every group and is not repeated.

### 8.1 `money` — pockets and the ledger

**Entities:** `pocket`, `money`
**Log:** `money_group_change_log` · **Bookmark:** `money_bookmark`
**Endpoints:** `GET /v2/money/pull/:seq`, `POST /v2/money/push`

#### Columns

```
pocket (6)
pocket_id          TEXT     PK, non-empty
pocket_name        TEXT     NOT NULL
pocket_type        TEXT     NOT NULL   -- 'absolute' today; REFERENCES pocket_enum
pocket_ordering    INTEGER  NOT NULL
pocket_updated_at  INTEGER  NOT NULL   -- LWW clock
pocket_deleted_at  INTEGER?            -- null = live

money (7)
money_id           TEXT     PK, non-empty
timestamp          INTEGER  NOT NULL   -- business time, NOT a merge clock
money_value        REAL     NOT NULL   -- immutable once recorded
pocket_id          TEXT     NOT NULL   -- immutable; may dangle on the server
money_note         TEXT     NOT NULL   -- editable
money_updated_at   INTEGER  NOT NULL   -- LWW clock
money_deleted_at   INTEGER?            -- null = live
```

`*_sync_at` never crosses the wire.

#### Merge

- `pocket` — plain LWW on `pocket_updated_at`; every column editable.
- `money` — insert, note edit, soft delete; never re-price:
  - no stored row → `applied`;
  - `timestamp`, `money_value` or `pocket_id` differ → `stale`;
  - identical (timestamp included) → `noop`;
  - `money_updated_at` greater → `applied` (note + deleted flag);
  - otherwise → `stale`.

#### Notes

- There is no FK between `money.pocket_id` and `pockets` on the server. A money
  row may be stored before its pocket exists.
- Deleting a pocket soft-deletes its money rows in one local transaction (§6.1).
- A money correction is a **new money row**, not an edit. Only the note may be
  changed in place.
- A note edit updates `money_note`, bumps `money_updated_at`, and sets
  `money_sync_at = NULL`.
- The client parks money rows whose pocket is still unknown (§7.5).
- A money row whose pocket is soft-deleted is an **orphan**: kept, hidden from
  live views, still counted in totals, and visible again if the pocket is
  restored (§6.6). It is never deleted automatically.

**Limits:** pull 5000 / 20000; push 1000 frames / 1 MB.

**Server expects from the client**

- Frames for `pocket` and `money` only; a `pocket` frame before the `money`
  frames that reference it.
- Every column of the dictionary, with explicit `null` for the nullable ones.
- A money row's `timestamp`, `money_value` and `pocket_id` unchanged after
  creation. A changed amount is a client bug and is answered `stale`.
- A note edit to carry a newer `money_updated_at`.
- A pocket delete to arrive as soft deletes for the pocket and its money rows,
  not as hard deletes.

**Client must**

- Keep one `money_bookmark` and two dirty flags (`pocket_sync_at`,
  `money_sync_at`). On every pocket or money edit, bump that row's
  `*_updated_at` and set its `*_sync_at = NULL`.
- Pull pockets before money when applying a page; park a money row whose pocket
  is still unknown and retry it on the next page.
- Never edit `timestamp`, `money_value` or `pocket_id`; a correction is a new
  money row.
- Update `money_note` and `money_updated_at`, and set `money_sync_at = NULL`, on
  a note edit.
- Soft-delete the money rows when a pocket is deleted.
- Keep a money row whose pocket is soft-deleted as an orphan; do not tombstone
  it automatically (§6.6).
- Apply a `stale` money ack by replacing the local row with the server's row.

### 8.2 `customer`

**Entity:** `customer` · **Log:** `customer_group_change_log` ·
**Bookmark:** `customer_bookmark`
**Endpoints:** `GET /v2/customer/pull/:seq`, `POST /v2/customer/push`

```
customer (5)
customer_id          TEXT     PK, non-empty
customer_name        TEXT     NOT NULL
customer_phone       TEXT     NOT NULL
customer_updated_at  INTEGER  NOT NULL   -- LWW clock
customer_deleted_at  INTEGER?            -- null = live
```

**Merge:** plain LWW on `customer_updated_at`; every column editable. No
dependencies. Soft delete is an ordinary row.

**Limits:** pull 5000 / 20000; push 1000 frames / 1 MB.

**Server expects from the client:** one `customer` frame per line, every column,
a newer `customer_updated_at` for every edit, and a soft delete for deletion.

**Client must:** keep one `customer_bookmark` and `customer_sync_at`; bump the
clock and set the flag to `NULL` on every edit; soft-delete; apply the `stale`
winner.

### 8.3 `supplier`

**Entity:** `supplier` · **Log:** `supplier_group_change_log` ·
**Bookmark:** `supplier_bookmark`
**Endpoints:** `GET /v2/supplier/pull/:seq`, `POST /v2/supplier/push`

```
supplier (5)
supplier_id          TEXT     PK, non-empty
supplier_name        TEXT     NOT NULL
supplier_note        TEXT     NOT NULL
supplier_updated_at  INTEGER  NOT NULL   -- LWW clock
supplier_deleted_at  INTEGER?            -- null = live
```

**Merge:** plain LWW on `supplier_updated_at`; every column editable. No
dependencies. Soft delete is an ordinary row.

**Limits:** pull 5000 / 20000; push 1000 frames / 1 MB.

**Server expects from the client:** one `supplier` frame per line, every column,
a newer `supplier_updated_at` for every edit, and a soft delete for deletion.

**Client must:** keep one `supplier_bookmark` and `supplier_sync_at`; bump the
clock and set the flag to `NULL` on every edit; soft-delete; apply the `stale`
winner.

### 8.4 `method`

**Entity:** `method` · **Log:** `method_group_change_log` ·
**Bookmark:** `method_bookmark`
**Endpoints:** `GET /v2/method/pull/:seq`, `POST /v2/method/push`

```
method (5)
method_id          TEXT     PK, non-empty
method_name        TEXT?              -- null = the base method row
method_kind        TEXT     NOT NULL
method_updated_at  INTEGER  NOT NULL  -- LWW clock
method_deleted_at  INTEGER?           -- null = live
```

**Merge:** plain LWW on `method_updated_at`; every column editable. `null` is a
value for `method_name`, not a missing column. No dependencies.

**Limits:** pull 5000 / 20000; push 1000 frames / 1 MB.

**Server expects from the client:** one `method` frame per line, every column,
a newer `method_updated_at` for every edit, and a soft delete for deletion.
`method_name` may be `null`; `null` is a value, not a missing column.

**Client must:** keep one `method_bookmark` and `method_sync_at`; bump the clock
and set the flag to `NULL` on every edit; soft-delete; apply the `stale` winner.

### 8.5 `social`

**Entity:** `social` · **Log:** `social_group_change_log` ·
**Bookmark:** `social_bookmark`
**Endpoints:** `GET /v2/social/pull/:seq`, `POST /v2/social/push`

```
social (5)
social_id          TEXT     PK, non-empty
social_name        TEXT     NOT NULL
social_value       TEXT     NOT NULL
social_updated_at  INTEGER  NOT NULL  -- LWW clock
social_deleted_at  INTEGER?           -- null = live
```

**Merge:** plain LWW on `social_updated_at`; every column editable. No
dependencies.

**Limits:** pull 5000 / 20000; push 1000 frames / 1 MB.

**Server expects from the client:** one `social` frame per line, every column,
a newer `social_updated_at` for every edit, and a soft delete for deletion.

**Client must:** keep one `social_bookmark` and `social_sync_at`; bump the clock
and set the flag to `NULL` on every edit; soft-delete; apply the `stale` winner.

### 8.6 `extra`

**Entity:** `extra` · **Log:** `extra_group_change_log` ·
**Bookmark:** `extra_bookmark`
**Endpoints:** `GET /v2/extra/pull/:seq`, `POST /v2/extra/push`

```
extra (7)
extra_id          TEXT     PK, non-empty
extra_name        TEXT     NOT NULL
extra_value       REAL     NOT NULL
extra_kind        TEXT     NOT NULL   -- 'number' | 'percent' today; opaque to sync
extra_flag        INTEGER  NOT NULL   -- bitfield; bit 0 = DUAL; opaque to sync
extra_updated_at  INTEGER  NOT NULL   -- LWW clock
extra_deleted_at  INTEGER?            -- null = live
```

**Merge:** plain LWW on `extra_updated_at`; every column editable. Preserve flag
bits the client does not understand. No dependencies.

**Limits:** pull 5000 / 20000; push 1000 frames / 1 MB.

**Server expects from the client:** one `extra` frame per line, every column, a
newer `extra_updated_at` for every edit, and a soft delete for deletion. Preserve
`extra_flag` bits you do not understand.

**Client must:** keep one `extra_bookmark` and `extra_sync_at`; bump the clock
and set the flag to `NULL` on every edit; soft-delete; apply the `stale` winner.

### 8.7 `product` — catalog and stock journal

**Entities:** `product`, `category`, `product_category`, `product_name`,
`property`, `listing`, `image`, `product_event`
**Log:** `product_group_change_log` · **Bookmark:** `product_bookmark`
**Row endpoints:** `GET /v2/product/pull/:seq`, `POST /v2/product/push`
**One-product endpoints:** `GET /v2/product/one/pull/:product_id`,
`POST /v2/product/one/push/:product_id` — a scoped snapshot and a scoped push;
no bookmark, no new tables (`SYNC-V2-ONE-PRODUCT.md`)
**Byte endpoints:** `PUT /v2/product/image/blob/:image_id`,
`GET /v2/blob/:sha256`, `GET /v2/product/image/manifest` (§8.7.1)

#### Columns

```
product (6)
product_id          TEXT     PK, non-empty
product_name        TEXT     NOT NULL   -- primary display name
product_note        TEXT     NOT NULL
product_flag        INTEGER  NOT NULL   -- bitfield; bit 0 = unpublished
product_updated_at  INTEGER  NOT NULL   -- LWW clock
product_deleted_at  INTEGER?            -- null = live

category (4)
category_id          TEXT     PK, non-empty
category_name        TEXT     NOT NULL   -- a label; one live row per name is a form rule, not a key
category_updated_at  INTEGER  NOT NULL
category_deleted_at  INTEGER?

product_category (5)   -- the many-to-many link
product_category_id          TEXT     PK, non-empty
product_id                   TEXT     NOT NULL, non-empty
category_id                  TEXT     NOT NULL, non-empty
product_category_updated_at  INTEGER  NOT NULL
product_category_deleted_at  INTEGER?

product_name (5)   -- aliases, not the primary name
product_name_id          TEXT     PK, non-empty
product_id               TEXT     NOT NULL, non-empty
product_name_value       TEXT     NOT NULL
product_name_updated_at  INTEGER  NOT NULL
product_name_deleted_at  INTEGER?

property (5)
property_id          TEXT     PK, non-empty
product_id           TEXT     NOT NULL, non-empty
property_key         TEXT     NOT NULL   -- free-form; no enum, no dedupe
property_value       TEXT     NOT NULL
property_updated_at  INTEGER  NOT NULL
property_deleted_at  INTEGER?

listing (9)
listing_id          TEXT     PK, non-empty
product_id          TEXT     NOT NULL, non-empty
listing_name        TEXT     NOT NULL
listing_price       REAL     NOT NULL
listing_unit        INTEGER  NOT NULL
listing_kind        TEXT     NOT NULL   -- '' = unlabelled
listing_code        TEXT?              -- null = no code; '' is bad_frame
listing_updated_at  INTEGER  NOT NULL
listing_deleted_at  INTEGER?

image (7)
image_id          TEXT     PK, non-empty
image_order       INTEGER  NOT NULL
image_name        TEXT     NOT NULL   -- display name and local file key; NOT a server key
image_mime        TEXT     NOT NULL   -- png | jpeg | webp today
product_id        TEXT     NOT NULL, non-empty
image_updated_at  INTEGER  NOT NULL
image_deleted_at  INTEGER?

product_event (8)   -- append-only journal
product_event_id          TEXT     PK, non-empty
product_event_created_at  INTEGER  NOT NULL   -- event time, NOT a merge clock
product_event_value       INTEGER  NOT NULL   -- signed stock delta
product_event_capital     REAL     NOT NULL   -- capital carried by the event
product_event_note        TEXT     NOT NULL
product_id                TEXT     NOT NULL, non-empty
stock_id                  TEXT?              -- opaque, device-local
record_id                 TEXT?              -- may dangle
```

#### Merge

- The eight catalog entities — plain LWW on their own `*_updated_at`; every
  column editable; tie → stored wins.
- `category` is a group-wide row, not a product child: it carries no
  `product_id` and is therefore **outside** the one-product scope
  (`SYNC-V2-ONE-PRODUCT.md` §1.1). The link (`product_category`) is a child and
  is in scope. A link may name a category this device has not received yet — the
  usual dangling reference (§7.2): store it, keep it, do not draw it. The client
  therefore keeps **no key from a link to its category** (migration-55): the
  scoped route never carries categories, so a keyed link would make a legal page
  uncommittable.
- A product may be filed under zero or more categories. Un-ticking a category
  soft-deletes that link row and re-ticking it creates a new one (the pair is not
  the key — `product_category_id` is), so two devices ticking the same box do not
  fight over one row. Both rows are kept when two devices tick it offline: the
  server stores both (`kassir-server` migration `0019`) and the client stores
  both (migration-55). The form still draws the category once, because it reads
  links by `category_id`.
- One live row per category **name** is likewise a rule of the desktop's forms,
  not a key on `categories`: two devices may create "Minuman" offline, both rows
  are legal, and `CategoryService` is what refuses a duplicate on one device. A
  duplicate that arrives through sync is kept and shown — dropping it would lose
  a category another till is filing products under.
- `product_event` — append-only: new id → `applied`; existing id → `noop`
  (payload not compared).
- A `product_name` alias is not the primary name: renaming the primary name
  updates `products`, not `product_names`.
- One live barcode, property key and alias are rules of the desktop's forms, not
  keys on the tables (migration-56). Two tills may assign the same code, add the
  same key or record the same alias while offline; both rows are legal and the
  client stores both, because a unique key would make a legal page uncommittable
  — exactly as for a category name. `ProductService` is what refuses a duplicate
  on one device.
- A listing's `product_id` may be re-parented; it is a normal LWW edit, not an
  immutable violation.
- `listing_code` is `null` or a non-empty string. `""` is `bad_frame`.

#### `stocks` is derived, not synced

`stocks` is a local projection of the event journal:

```
for each product:
    qty     = fold(events.product_event_value)                    -- sum of the signed deltas
    capital = fold(events.product_event_capital)                  -- the newest event that carries one
```

`capital` is the **newest non-zero** `product_event_capital`: a capital
correction is a delta-0 event, so the newest one is the lot's current cost, and
`0` is what an event says when it has nothing to say about cost (a lot opened
with no cost to copy, a bonus fill) — it must not wipe a cost that a purchase
already stated.

Replay order is `(product_event_created_at, product_event_id)` ascending, **not
pull order**. The journal is the source of truth; the stock row is a cache. Do
not sync a stock row and the journal as two independent LWW entities — and note
what that implies: a pull **rebuilds** the cost from the journal, so a device
whose journal carries the wrong cost (a database migrated from the pre-v2 schema,
rows imported with the price in the `capital` field) sees it on the first sync.
The merge logs every lot whose cached cost the rebuild moves.

`stock_id` is opaque and device-local: store it, never join on it, and do not
enforce a FK on it. `record_id` may dangle.

#### 8.7.1 Image bytes (the side channel)

Image **rows** sync exactly like the rest of the catalog. Their **bytes** do
not, and the split is the whole design:

| | image rows | image bytes |
| --- | --- | --- |
| transport | `product_group_change_log` → NDJSON `row` lines / bare push frames | raw HTTP bodies |
| ordering | `seq`; the client bookmark | none — the row's `image_updated_at` |
| conflict | plain LWW on `image_updated_at` | the row's LWW winner decides |
| spends a `seq` | yes | **no** |
| dictionary | the 7 columns of §8.7 | no column, no entity, no frame |

A client that never calls these routes keeps working: it shows placeholders,
exactly as before this section existed.

**Identity.** A blob is addressed by `(image_id, version)` where `version` is
the `image_updated_at` of the row those bytes were produced for. Never by
`image_name`: that is a display name, it is LWW-mutable, and two devices may hold
different values for the same image.

**The servable blob is the one at the row's current `image_updated_at`** — not
the newest upload and not the last to arrive. The manifest join says so:

```sql
FROM images i
JOIN image_blob b ON b.image_id = i.image_id AND b.version = i.image_updated_at
WHERE i.image_deleted_at IS NULL
```

So a row at `2000` whose only blob is at `1000` is **not** served: the row
changed, the old bytes are no longer that image, and the device shows a
placeholder until the new upload lands. Serving them would be worse — every
client would download a stale picture and re-download it on every cycle.

**The routes** (same sync token as every other v2 route, §2.5):

```
PUT /v2/product/image/blob/{image_id}?version={image_updated_at}
    Content-Type: image/png | image/jpeg | image/webp
    Content-Encoding: identity only
    <raw bytes>
 → 201 {"image_id","version","sha256","byte_size","mime","deduped":false,"current":true}
 → 200  the same bytes were already stored (retry, or another image shares them)
 → 404 image_unknown   no such image row: push the row first
 → 409 image_deleted   the row is soft-deleted: drop the upload
 → 409 blob_conflict   different bytes own this (image_id, version); body adds the winner's sha256
 → 413 payload_too_large   over BLOB_MAX_BYTES (default 8 MB), detected while streaming
 → 415 unsupported_media_type   wrong Content-Type/Content-Encoding, or bytes that are not png/jpeg/webp
 → 400 bad_request (missing/malformed `version`) · empty_blob (zero-byte body)

GET /v2/blob/{sha256}
 → 200 the bytes, Content-Type from the stored mime, Content-Length,
       ETag: "<sha256>", Cache-Control: private, max-age=31536000, immutable
 → 304 If-None-Match matched: the caller already has them
 → 404 blob_missing    no object with that hash: refresh the manifest
 → 400 bad_request     :sha256 is not 64 lowercase hex characters
 → 500 blob_lost       catalogued but the file is gone: server-side fault, retry later

GET /v2/product/image/manifest?after={image_id}&limit={n}
 → 200 {"blobs":[{"image_id","version","sha256","byte_size","mime"}],"more":bool,"next":string|null}
```

`Content-Type` on the upload is a claim: the server sniffs the magic bytes and a
mismatch is `415`. Storing bytes under a type they are not would make every later
download lie about itself.

**Idempotency.** Every blob operation is idempotent, so the client needs no
retry bookkeeping:

| situation | result |
| --- | --- |
| the same bytes PUT again for the same `(image_id, version)` | `200`, same `sha256`, `deduped: true` |
| the same bytes PUT for two different images | `200`, one object on disk, two claims |
| an ack lost after the server stored the blob | re-PUT → `200`, nothing changes |
| different bytes for an already-claimed `(image_id, version)` | `409 blob_conflict`; the stored copy wins |
| a stale version uploaded after a newer one exists | `200`/`201` with `current: false`; never served; collected later |
| GET a hash twice | the same bytes; `304` the second time with `If-None-Match` |
| GET a hash the manifest no longer lists | `404 blob_missing` → refresh the manifest |

**The client's three local columns** (client-only, never on the wire):

```sql
image_blob_version INTEGER   -- the image_updated_at the local file belongs to; NULL = no file
image_blob_sha256  TEXT      -- sha256 of the local file
image_blob_sync_at INTEGER   -- NULL = the local bytes were never accepted by the server
```

They drive everything, and nothing else does:

| question | predicate |
| --- | --- |
| has a usable local file | `image_blob_version = image_updated_at AND image_blob_sha256 IS NOT NULL` |
| needs **upload** | `image_deleted_at IS NULL AND image_blob_sync_at IS NULL AND image_blob_version = image_updated_at` |
| needs **fetch** | `image_deleted_at IS NULL AND` (no usable file **or** `image_blob_version <> image_updated_at` **or** the manifest reports a different `sha256`) |

Files live at `AppData/images/{image_id}.{ext}`. Keying by `image_id` is what
makes a rename, a reorder or a re-parent a metadata-only edit. A device that
already keys files by `image_name` may keep doing so but must resolve collisions
by `image_id`; the server is never keyed by `image_name`.

**The cycle** adds two steps to §9.2, both outside the page transaction:

1. **rows, then bytes.** Push the `image` row; only when its ack is
   `applied`/`noop` (and its version is the current one) upload the file.
   Uploading for a version that came back `stale` uploads bytes nobody will ever
   serve.
2. **bytes after the page.** After the pull page commits, for each row that
   needs a fetch: call the manifest **once**, then `GET` each missing hash.
   Verify `sha256` and `byte_size`, write `*.part`, `rename()` into place, then
   set the three columns. Downloaded bytes are already on the server: set
   `image_blob_sync_at` so they are never re-uploaded.

**Conflict recovery.** `409 blob_conflict` is the only real conflict: two devices
produced different bytes for the same `(image_id, version)` — the same
millisecond. The stored copy wins. The client must **not** overwrite and must
**not** bump `image_updated_at` in a loop; it clears `image_blob_version`, fetches
the winner, and treats its own crop as a **new edit** (new clock, new upload) if
the user still wants it. That is the LWW rule of §5.2, not a special case.

**Server storage.** Two tables, no `seq`, no `sync_seq`, no log entry:

```sql
blob_object (sha256 PK, byte_size, mime, created_at)   -- one row per distinct byte sequence
image_blob  (image_id, version, sha256, uploaded_at)   -- PK (image_id, version)
```

Bytes live at `<BLOB_DIR>/<sha256[0:2]>/<sha256>`, uploaded through
`<BLOB_DIR>/tmp/`. `BLOB_DIR` (default `data/blobs`), `BLOB_MAX_BYTES` (default
8 MB) and `BLOB_GC_DAYS` (default 7) are server configuration. There is
deliberately **no FK** from `image_blob` to `images` — a concurrent push may land
a child first — and there **is** an FK from `image_blob.sha256` to
`blob_object.sha256`, which is what stops the collector removing bytes an image
still points at. The crash-order invariant: **the file is written before the row
that names it, and deleted after it.** A crash then leaks bytes (reclaimable) and
never leaves a row pointing at a missing file (a `500` for every device).

**Collection.** `bun run db:prune-blobs` deletes, after `BLOB_GC_DAYS`: claims
that are not their image's current version, claims of soft-deleted images, and
objects no claim references (then their files). The blob at a live image's
current version is **never** collected, whatever its age. `bun run blobs:audit`
compares the tables with the disk in both directions — leaked files, and
`lost` rows (the `blob_lost` 500); `--delete` reclaims the leaked ones.

**Limits.** upload `BLOB_MAX_BYTES` (default 8 MB), manifest page 5000 / 20000
by `image_id`, `identity` encoding only, three mime types.

#### Notes

- The server does not require a child's `product_id` to exist.
- The client should make a child `product_id` deferrable/check-after-page, so a
  child that arrives before its parent does not fail the page.
- Deleting a product sends child tombstones in the same batch (§6.2).
- A product event is never edited or deleted; a correction is a new event.
- A child created on another device after the delete is an **orphan**: kept,
  hidden from live views, and visible again if the product is restored (§6.6).
  The events are never hidden by this rule and are never deleted.

**Limits:** pull 5000 / 20000; push 1000 frames / 1 MB; image bytes 8 MB per
upload, manifest page 5000 / 20000 (§8.7.1).

**Backfill:** `bun run db:backfill-product` (§13.2).

**Server expects from the client**

- Frames for the six entities only; product before its children and before its
  events.
- Every column of each dictionary; `listing_code` is `null` or a non-empty
  string (`""` is `bad_frame`).
- A product event id to be unique; a replayed id is `noop`.
- Soft deletes for a deleted product's children, in the same batch.
- No expectation that a cross-group reference exists.
- For image bytes: an upload only for an `image_id` that already exists, with a
  `version` equal to a value the client actually pushed, as a raw body in one of
  the three mime types. The server sniffs the bytes; a mislabelled body is
  `415`.

**Client must**

- Keep one `product_bookmark` and six dirty flags. On every catalog edit, bump
  that entity's `*_updated_at` and set its `*_sync_at = NULL`.
- A listing/property/image/alias edit dirties only that child row, not the
  product header.
- A new `product_event` sets `product_event_sync_at = NULL`; never edit or
  delete an event. A correction is a new event.
- Push in the order `product` → `product_name` → `property` → `listing` →
  `image` → `product_event`.
- Rebuild `stocks` from the event journal in `(created_at, id)` order, not pull
  order.
- Store `stock_id` as opaque; never join on it and never FK it.
- Allow `record_id` to dangle.
- Show a placeholder for an image row whose file is missing; do not fail the
  page. Then fetch it after the page commits — never before, and never as a
  condition for moving the bookmark (§8.7.1).
- When deleting a product, soft-delete its live children in the same batch and
  leave events alone.
- Make a child `product_id` deferrable or check it after the page.
- Initialise `product_bookmark` from the existing cursor after the backfill, or
  reset it to 0 if the journal joined later.
- For image bytes, keep the three client-only columns of §8.7.1, leave them
  untouched by a pull merge, upload after the row's ack, fetch after the page,
  and treat `409 blob_conflict` as "adopt the server's copy", never as a reason
  to bump the clock in a loop.

### 8.8 `record` — the sale aggregate

**Entity:** `record` aggregate (header + five child tables)
**Log:** `record_group_change_log` · **Bookmark:** `record_bookmark`
**Endpoints:** `GET /v2/record/pull/:seq`, `POST /v2/record/push`

#### The aggregate

One change is the whole record:

```json
{
  "r": { …20 header columns… },
  "ch": {
    "record_listings": [ … ],
    "record_methods":  [ … ],
    "record_extras":   [ … ],
    "record_images":   [ … ],
    "discounts":       [ … ]
  }
}
```

All five `ch` keys are **always present** (send `[]` when empty). A missing or
unknown `ch` key is `bad_frame`. Child rows do not repeat `record_id`; it is
inherited from `r.record_id`. Child array order is not semantic.

The child tables are **snapshots**, not the directory entities:

- `record_listings` is a sale line, not a product `listing`.
- `record_methods` is the payment snapshot, not the `method` directory.
- `record_extras` is the sale's snapshot, not the `extra` directory.
- `record_images` is a receipt image, not a product `image`. Its row syncs; its
  bytes do not — the product group's byte channel (§8.7.1) is keyed by
  `image_id` and does not cover record images, so a missing file is a
  placeholder, not a page failure.

They reference directory rows by id, but they travel and merge with the record.
The customer and supplier names on the record are also snapshots; changing the
customer or supplier directory row does not rewrite an existing record.

#### Columns

```
record header (20)
record_id             TEXT     PK, non-empty
record_created_at     INTEGER  NOT NULL   -- business time, NOT a merge clock
record_paid_at        INTEGER?
record_rounding       REAL     NOT NULL
record_credit_at      INTEGER?
record_cashier        TEXT     NOT NULL   -- opaque label; `cashiers` is never synced (§7.2)
record_mode           TEXT     NOT NULL   -- 'incoming' | 'outcoming' today
record_pay            REAL     NOT NULL
record_note           TEXT     NOT NULL   -- editable
record_fix            INTEGER  NOT NULL   -- money precision; synced
record_customer_name  TEXT     NOT NULL
record_customer_phone TEXT     NOT NULL
record_sub_total      REAL     NOT NULL
record_total          REAL     NOT NULL
record_updated_at     INTEGER  NOT NULL   -- LWW clock
record_deleted_at     INTEGER?            -- null = live
record_supplier_id    TEXT?              -- may dangle
record_supplier_name  TEXT     NOT NULL
record_flag           INTEGER  NOT NULL   -- bitfield, opaque to sync (§8.8)
record_pair_id        TEXT?              -- may dangle; self-reference to a paired record

record_listings (11)
record_listing_id        TEXT     PK, non-empty
record_listing_group_id  TEXT     NOT NULL
product_event_id         TEXT?              -- may dangle
product_id               TEXT?              -- may dangle
record_listing_name      TEXT     NOT NULL
record_listing_kind      TEXT     NOT NULL
record_listing_unit      INTEGER  NOT NULL
record_listing_price     REAL     NOT NULL
record_listing_qty       REAL     NOT NULL
record_listing_capital   REAL     NOT NULL
record_listing_total     REAL     NOT NULL

record_methods (3)
record_method_id    TEXT     PK, non-empty
method_id           TEXT     NOT NULL   -- may dangle
record_method_pay   REAL     NOT NULL

record_extras (6)
record_extra_id      TEXT     PK, non-empty
record_extra_name    TEXT     NOT NULL
record_extra_value   REAL     NOT NULL
record_extra_eff     REAL     NOT NULL
record_extra_kind    TEXT     NOT NULL   -- 'number' | 'percent' today
record_extra_flag    INTEGER  NOT NULL   -- bitfield

record_images (4)
record_image_id      TEXT     PK, non-empty
record_image_order   INTEGER  NOT NULL
record_image_name    TEXT     NOT NULL   -- key into AppData/images/; bytes not covered by §8.7.1
record_image_mime    TEXT     NOT NULL   -- png | jpeg | webp today

discounts (6)
discount_id          TEXT     PK, non-empty
discount_group_id    TEXT     NOT NULL
record_listing_id    TEXT     NOT NULL   -- should name a listing in the same aggregate; may dangle
discount_kind        TEXT     NOT NULL   -- 'number' | 'percent' | 'pcs' today
discount_value       REAL     NOT NULL
discount_eff         REAL     NOT NULL
```

The table is `discounts`, not `record_discounts`.

#### Flags and labels

- `record_flag` is a bitfield and is **opaque to sync**: the server stores and
  compares it as an integer, and a client must preserve bits it does not
  understand (the same rule as `extra_flag`, §8.6). Unlike `product_flag` bit 0
  (unpublished) and `extra_flag` bit 0 (DUAL), no bit is defined here by the
  contract; the desktop defines them and owns their meaning.
- `record_cashier` is an opaque display value. `cashiers` is never synced
  (§1.5), so another device may not be able to resolve it: store it, show it,
  and fall back to the raw value when it cannot (§7.2). It is never a join key.

#### Merge

Full LWW on `record_updated_at` (§5.5): every header column and every child row
is replaceable when the incoming aggregate has a strictly newer clock. An
identical aggregate is `noop`; a tie or older clock is `stale`. The children are
replaced wholesale: a child omitted from the winning frame is deleted.

The server cannot distinguish a legitimate correction from a buggy device that
rewrote a sale. The protection is on the client:

- After creation, do not change `record_created_at`, `record_cashier`,
  `record_mode`, `record_fix`, `record_rounding`, `record_sub_total`,
  `record_total`, the customer/supplier snapshot, or any child row.
- Editable after creation: `record_note`, `record_flag`, `record_deleted_at`,
  `record_pair_id` (to link a correction), and the payment-settlement fields
  (`record_paid_at`, `record_pay`, `record_credit_at`).
- A correction is a **new record**, optionally paired via `record_pair_id`, and
  the original is soft-deleted. Never rewrite history in place.
- Any header or child edit must bump `record_updated_at` and set
  `record_sync_at = NULL` in the same local transaction. A child edit that does not
  bump the header is never pushed, because the push selects dirty headers.

#### Child primary key ownership

Child primary keys are globally unique. A key reused under a different
`record_id` — in the batch or against the database — is `bad_frame`, and nothing
in the batch is applied. The same key twice inside one aggregate is also
`bad_frame`.

#### Soft delete

Set `record_deleted_at` and `record_updated_at`, set `record_sync_at = NULL`,
keep all children, and push the whole aggregate. Restoring sets
`record_deleted_at = null` with a newer clock. Never hard-delete a record or its children.

#### Limits and page budget

- Pull: default `limit=1000`, max `5000`; 8 MB payload budget (§3.5).
- Push: 1000 frames / 8 MB uncompressed; one record per frame; a record cannot
  be split.
- A single record over 8 MB cannot be sent; the desktop must cap record size.

#### Push acks

A record `stale` ack carries `row` (header) and `ch` (children). Acks are
streamed after the commit, one at a time, to keep memory bounded (§4.7).

#### Rollout

No backfill. The record group is rebuilt by a **full refresh** (§13.3):
clear the server's record group, set `record_bookmark = 0` and mark every local
record dirty, then re-push.

**Server expects from the client**

- One aggregate frame per record: the 20 header columns and all five `ch` keys,
  every child column present.
- `ch` keys exactly `record_listings`, `record_methods`, `record_extras`,
  `record_images`, `discounts`; `[]` when empty; no unknown key.
- No `record_id` inside a child row; it is inherited from the header.
- Child primary keys globally unique; no key reused under another record.
- At most one frame per record id; a record never split across frames.
- A newer `record_updated_at` for every accepted edit.
- A soft delete to keep the children and set `record_deleted_at`.

**Client must**

- Keep one `record_bookmark` and one `record_sync_at` on the header; the five
  child tables have no sync flag.
- Any header or child edit bumps `record_updated_at` and sets
  `record_sync_at = NULL` in the same transaction.
- Push the whole aggregate, including all children of a soft-deleted record.
- Never sync a child row on its own.
- Treat child arrays as sets keyed by primary key; never use array order for
  display.
- Keep child primary keys globally unique.
- Soft-delete the header and keep the children.
- Never change financial/identity fields or the child set after creation; a
  correction is a new record, optionally paired via `record_pair_id`, and the
  original is soft-deleted.
- Apply a `stale` ack's `row` + `ch` as the winner, then set
  `record_sync_at = ack.seq` — unless the header's `record_updated_at` changed
  since the frame was sent, in which case skip the ack (§4.12).
- Surface a record that alone exceeds 8 MB; never silently skip it.
- On upgrade, set `record_bookmark = 0` and `record_sync_at = NULL` for every
  local record, keep the rows and children, then sync. Do **not** bump
  `record_updated_at`; the existing clocks are what the LWW merge should use.

### 8.9 `combo` — catalogue template aggregate

A combo is a named template with ordered listing components — each carrying
its own ordered discount stack — ordered Extra presets, an active flag and an
optional cover reference. It is catalogue data, not a sale: selecting one
expands its current references into ordinary cart rows, and a committed record
keeps frozen sale snapshots. The full group contract is
`docs/SYNC-V2-COMBO.md`.

Header (`combos`, 7 columns):

```
combo_id           TEXT PK
combo_name         TEXT NOT NULL
combo_active       INTEGER NOT NULL   (0 | 1)
combo_cover_name   TEXT?              (null together with combo_cover_mime)
combo_cover_mime   TEXT?
combo_updated_at   INTEGER NOT NULL
combo_deleted_at   INTEGER?
```

Children (`ch` keys; the aggregate key `combo_id` is inherited and never on the
wire, and `combo_discounts` names its component instead):

```
combo_listings:  combo_listing_id  TEXT PK, listing_id TEXT, combo_listing_qty INTEGER, combo_listing_order INTEGER
combo_extras:    combo_extra_id    TEXT PK, extra_id   TEXT, combo_extra_order   INTEGER
combo_discounts: combo_discount_id TEXT PK, combo_listing_id TEXT, combo_discount_value REAL,
                 combo_discount_kind TEXT (number | percent | pcs), combo_discount_order INTEGER
```

`combo_discounts` is the one child set that hangs off another child: a rule
names its component (`combo_listing_id`), never the combo, exactly as a record's
`discounts` name their `record_listing_id`. The derived rupiah is not stored —
it belongs to the price and quantity at expansion time. A rule whose component
is not in the same aggregate is dropped rather than stored, because the
component set is replaced wholesale; the kind, the value bound and the percent
bound are `bad_frame` errors.

Merge is full last-writer-wins on `combo_updated_at` over the whole aggregate;
children are compared as a set keyed by primary key and replaced wholesale when
the header wins. An identical aggregate is a `noop` before the clock is
compared. `listing_id` and `extra_id` are opaque cross-group references: the
page that carries a combo may arrive before the product or extra page, and a
reference may be tombstoned, so neither side enforces a foreign key.

Cover **bytes** do not sync in this group yet; the row carries the name and MIME
so a device can show a placeholder until the file is available. Push bounds:
1000 frames / 8 MB; pull: 1000 default / 5000 maximum, 8 MB page budget.

## 9. Client state and cycles

### 9.1 Bookmarks and dirty flags

The client stores one integer bookmark per group and one dirty flag per
entity/aggregate:

| group | bookmark | dirty flags |
| --- | --- | --- |
| `money` | `money_bookmark` | `pocket_sync_at`, `money_sync_at` |
| `customer` | `customer_bookmark` | `customer_sync_at` |
| `supplier` | `supplier_bookmark` | `supplier_sync_at` |
| `method` | `method_bookmark` | `method_sync_at` |
| `social` | `social_bookmark` | `social_sync_at` |
| `extra` | `extra_bookmark` | `extra_sync_at` |
| `product` | `product_bookmark` | `product_sync_at`, `category_sync_at`, `product_category_sync_at`, `product_name_sync_at`, `property_sync_at`, `listing_sync_at`, `image_sync_at`, `product_event_sync_at` |
| `combo` | `combo_bookmark` | `combo_sync_at` only; the three child tables have none |
| `record` | `record_bookmark` | `record_sync_at` only; the five child tables have none |

The entity map:

| entity | group | how it travels | merge clock | dirty flag |
| --- | --- | --- | --- | --- |
| `pocket` | money | row | `pocket_updated_at` | `pocket_sync_at` |
| `money` | money | row | `money_updated_at` | `money_sync_at` |
| `customer` | customer | row | `customer_updated_at` | `customer_sync_at` |
| `supplier` | supplier | row | `supplier_updated_at` | `supplier_sync_at` |
| `method` | method | row | `method_updated_at` | `method_sync_at` |
| `social` | social | row | `social_updated_at` | `social_sync_at` |
| `extra` | extra | row | `extra_updated_at` | `extra_sync_at` |
| `product` | product | row | `product_updated_at` | `product_sync_at` |
| `category` | product | row | `category_updated_at` | `category_sync_at` |
| `product_category` | product | row | `product_category_updated_at` | `product_category_sync_at` |
| `product_name` | product | row | `product_name_updated_at` | `product_name_sync_at` |
| `property` | product | row | `property_updated_at` | `property_sync_at` |
| `listing` | product | row | `listing_updated_at` | `listing_sync_at` |
| `image` | product | row | `image_updated_at` | `image_sync_at` |
| `product_event` | product | row, append-only | none; `product_event_created_at` is event time | `product_event_sync_at` |
| `combo` | combo | aggregate header | `combo_updated_at` | `combo_sync_at` |
| `combo_listings` | combo | child of the aggregate | none | none |
| `combo_extras` | combo | child of the aggregate | none | none |
| `combo_discounts` | combo | child of the aggregate | none | none |
| `record` | record | aggregate header | `record_updated_at` | `record_sync_at` |
| `record_listings` | record | child of the aggregate | none | none |
| `record_methods` | record | child of the aggregate | none | none |
| `record_extras` | record | child of the aggregate | none | none |
| `record_images` | record | child of the aggregate | none | none |
| `discounts` | record | child of the aggregate | none | none |

`*_sync_at` semantics:

- `NULL` = dirty: this entity/aggregate has changes the server has not accepted.
- After a pull merge: `*_sync_at = s` (the row/aggregate is now synced).
- After a push ack: `*_sync_at = ack.seq`.
- On a local edit: set `*_sync_at = NULL` and bump `*_updated_at` in the same
  transaction, only when a column actually changed.
- For record and combo, any header or child edit bumps the **header's**
  `*_updated_at` and sets the **header's** `*_sync_at = NULL`.

Never share a bookmark between groups. Never advance a bookmark past `done.s`.

### 9.2 The full cycle

```
syncGroup():
    loop:                                  # ① pull
        page = GET /v2/<group>/pull/{bookmark}?limit=<default>
        merge + commit
        if not page.more: break

    loop:                                  # ② push
        batch = dirty rows/records, ordered as §4.1 says, within the bound
        if batch is empty: break
        acks = POST /v2/<group>/push (batch)
        merge + commit
        uploadPendingImageBlobs()          # product only: rows first, then bytes

    one more pull from {bookmark}          # picks up other devices' work
    fetchMissingImageBytes()               # product only, and only if some row needs it
```

- **Pull before push.** Every pulled row/record is marked synced as it is
  merged, so it is never pushed back. Pushing after a fresh pull means the
  client's data is based on the newest state, so `stale` answers are rare.
- The cycle is therefore **pull → push → pull**. The final pull is usually a
  single empty page.
- The final pull may return the rows/records this client just pushed, as `noop`
  lines. That is expected: the client's bookmark did not move during the push.
  Applying them again is free — but not costless: on a first upload they *are* the
  whole catalogue, tens of pages of rows the device wrote minutes ago. So the
  client drops them as they arrive, keyed on the `seq` each `applied` ack carried
  (a `noop`/`stale` ack created no entry, so its seq is not the client's to skip),
  and still advances the bookmark past them. A page that was entirely its own is
  then one bookmark write. The cost is bandwidth on a slow link; what it buys is a
  closing pull that cannot re-merge — or re-fold `stocks` for — a catalogue that
  has not changed.
- If there is nothing to push, the push loop is skipped entirely.
- If nothing changed anywhere, the whole cycle is two requests (pull → empty,
  push → skipped, final pull → empty).
- **One cycle per group at a time.** A group has one bookmark and one dirty set;
  two cycles racing would interleave pages and acks over the same bookmark.
  Serialise per group and coalesce triggers (§9.11).
- **Image bytes ride along, and never gate anything.** The upload runs after a
  batch is acked (a row that came back `stale` must not upload); the fetch runs
  after the page commits, one file per request, each in its own small
  transaction. A crash between the two loses nothing: the row is stored and the
  next cycle's "needs fetch" predicate is still true (§8.7.1).

### 9.3 Worked cross-group example

Two devices, A and B. Both start empty. The example uses the product and record
groups; the same cycle applies to every group.

**t1 — A creates a product, a listing and a stock event.**

```jsonl
{"e":"product","r":{"product_id":"p_01","product_name":"Kopi Susu","product_note":"","product_flag":0,"product_updated_at":1000,"product_deleted_at":null}}
{"e":"listing","r":{"listing_id":"l_01","product_id":"p_01","listing_name":"Kopi Susu 250ml","listing_price":25000,"listing_unit":1,"listing_kind":"","listing_code":null,"listing_updated_at":1000,"listing_deleted_at":null}}
{"e":"product_event","r":{"product_event_id":"pe_01","product_event_created_at":1500,"product_event_value":-3,"product_event_capital":15000,"product_event_note":"","product_id":"p_01","stock_id":"local-stock-7","record_id":null}}
```

The server acks `applied` for all three. The event's `record_id` is null
because the sale record does not exist yet.

**t2 — A records the sale.** One aggregate frame:

```json
{"e":"record","r":{"record_id":"r_01","record_created_at":2000,"record_paid_at":2000,"record_rounding":0,"record_credit_at":null,"record_cashier":"c_01","record_mode":"incoming","record_pay":25000,"record_note":"","record_fix":0,"record_customer_name":"","record_customer_phone":"","record_sub_total":25000,"record_total":25000,"record_updated_at":2000,"record_deleted_at":null,"record_supplier_id":null,"record_supplier_name":"","record_flag":0,"record_pair_id":null},"ch":{"record_listings":[{"record_listing_id":"rl_01","record_listing_group_id":"rg_01","product_event_id":"pe_01","product_id":"p_01","record_listing_name":"Kopi Susu 250ml","record_listing_kind":"","record_listing_unit":1,"record_listing_price":25000,"record_listing_qty":1,"record_listing_capital":15000,"record_listing_total":25000}],"record_methods":[{"record_method_id":"rm_01","method_id":"m_cash","record_method_pay":25000}],"record_extras":[],"record_images":[],"discounts":[]}}
```

The server acks `applied`.

**t3 — B syncs.** B may pull the groups in any order:

```
GET /v2/product/pull/0
← {"t":"meta","snapshot":3}
  {"t":"row","s":1,"e":"product","r":{…}}
  {"t":"row","s":2,"e":"listing","r":{…}}
  {"t":"row","s":3,"e":"product_event","r":{…}}
  {"t":"done","s":3,"more":false}

GET /v2/record/pull/0
← {"t":"meta","snapshot":4}
  {"t":"ag","s":4,"e":"record","r":{…r_01…},"ch":{…}}
  {"t":"done","s":4,"more":false}
```

Or B may pull the record first. The record's `product_id`, `product_event_id`
and `method_id` may still be unknown at that moment. B stores them as opaque
references and must not fail the record page:

- no FK on `record_listings.product_id` / `product_event_id`;
- no FK on `record_methods.method_id`;
- no FK on `record_supplier_id` / `record_pair_id`;
- `discounts.record_listing_id` may be checked within the aggregate but must not
  fail the page.

When the product group arrives, B's catalog view can resolve the references. The
sync itself never depends on the resolution.

**t4 — A edits the record note.** It bumps `record_updated_at`, sets
`record_sync_at = NULL`, and pushes the whole aggregate with the children
unchanged.
The server acks `applied` with a new seq. B pulls the record group and replaces
its aggregate.

**t5 — A comes back with an older version.** The server compares
`record_updated_at`, finds the stored aggregate newer, and acks `stale` with the
server's `row` and `ch`. A replaces its local aggregate and moves on.

**t6 — B records a sale that references a product only A has.** B pushes the
record; the server accepts it (no cross-group FK). When A syncs the product
group and then the record group, it receives the product and the record in
whatever order the logs deliver. A's catalog resolves the reference.

**What this shows:**

- Groups are independent: one bookmark, one log, one pull/push per group.
- Cross-group references are expected to dangle and must never fail a page.
- The record aggregate is pushed and pulled as one unit; no child-level sync.
- A retry or a duplicate is a `noop`; a stale version is repaired by the `stale`
  ack or by the next pull.

---

### 9.4 Client local state (normative)

The client mirrors each synced table. In plain English:

- Every synced table has the columns of its dictionary, plus one client-only
  dirty flag named `<entity>_sync_at`. The flag is never sent.
- The five record child tables have no dirty flag. The record header's
  `record_sync_at` owns the whole aggregate.
- Each group has a separate bookmark stored outside the tables. A bookmark is a
  single integer, not a row.
- The client never stores or sends the server's `sync_seq`.
- A newly created row/record is dirty from the start: `*_sync_at = NULL`.
- The `images` table additionally carries three client-only blob columns —
  `image_blob_version`, `image_blob_sha256`, `image_blob_sync_at` (§8.7.1). They
  are never sent, and a pull merge leaves them alone, exactly like the dirty
  flag: they describe the **local file**, not the row.
- A local edit is one transaction: change the columns, set `*_updated_at` to a
  value **strictly greater** than the stored one — `max(Date.now(), stored + 1)`
  (§5.1.1) — and set `*_sync_at` to `NULL`. For record, a child edit bumps the
  **header's** `record_updated_at` and sets the **header's** `record_sync_at =
  NULL`; the child tables have no clock and no dirty flag.
- A pull merge is one transaction per page: write the rows/aggregate exactly as
  received (never bump their clock), set `*_sync_at` to the change's `s`, then
  set the group bookmark to `done.s`.
- A push ack is one transaction: `applied`/`noop` set `*_sync_at = ack.seq`;
  `stale` first replaces the local row/aggregate with the returned winner, then
  sets the flag. Rows that changed since they were sent keep their dirty flag
  (§4.12).
- On a reset, mark synced rows (`*_sync_at IS NOT NULL`) and their children
  dirty and keep them; keep dirty rows and their children as they are. Nothing
  is deleted (§9.8).

### 9.4.1 Client durability (normative)

The bookmark is the **only** recovery point: whatever is not committed with it
is re-fetched, and whatever is committed without it is skipped. So:

- the local database runs in WAL mode with `synchronous >= NORMAL`; a page and
  its bookmark, and a batch and its acks, are one durable transaction;
- the bookmark is written **in the same transaction** as the rows it covers, not
  after it (a crash between the two either re-fetches a page — harmless — or
  skips one — unrecoverable);
- a dirty flag is part of the row write, and a row write is part of one
  transaction with its clock bump: there is no observable state where the clock
  moved but the row is not dirty, or vice versa;
- parked rows (§7.5) are persisted with the bookmark of the page that parked
  them, so a crash neither loses them nor replays them past their page;
- the client never keeps the bookmark only in memory or in a cache layered over
  the database.

### 9.5 Pull page workflow

```
after = bookmark for this group
response = GET /v2/<group>/pull/{after}?limit=<default>

switch response:
  401 -> stop; the device is not authorised
  400 or 410 -> resetGroup(); continue
  5xx/network -> retry with backoff

BEGIN LOCAL TRANSACTION
  last = after
  for each line as it arrives:
    meta -> remember snapshot for progress only
    row  -> mergePulledRow(line.e, line.r, line.s)   # §5.8; keep local if newer
    ag   -> mergePulledAggregate(line.r, line.ch, line.s)  # §5.8; keep local if newer
    del  -> deleteLocalRowOrRecord(line.e, line.id)  # for record, delete children too
    done -> last = line.s; more = line.more
  bookmark = last
COMMIT

if more: loop
```

`mergePulledRow` / `mergePulledAggregate` are §5.8. If the stream dies before
`done`, the transaction rolls back; ask again from the old bookmark.

### 9.6 Push batch workflow

```
loop:
  batch = dirty rows/records for this group, in the group's order,
          within the frame and byte bounds
  if batch is empty: break

  response = POST /v2/<group>/push with the batch

  switch response:
    400 bad_frame -> fix frame `index`; nothing landed; retry
    413 -> send a smaller batch; for record, surface a record that alone is too big
    415 -> fix the headers
    401 -> stop
    5xx/network -> retry the same batch with backoff

  BEGIN LOCAL TRANSACTION
    for each ack as it arrives:
      if the row/record changed since it was sent → skip (§4.12)
      applied/noop -> setDirtyFlag(ack.e, ack.seq)
      stale -> replaceLocalWith(ack.row, ack.ch); setDirtyFlag(ack.e, ack.seq)
    done -> commit
  COMMIT
```

The batch is always retried whole. Never try to resume it from the middle.

### 9.7 Conflict workflow

There are only two conflict moments, and they use the same rule:

1. **A pull delivers a row/aggregate that also exists locally.**
   - If the incoming version is newer, replace the local version and mark it
     synced.
   - If it is identical, mark it synced.
   - If the local version is newer, keep it. If it is dirty, it will be pushed;
     if it is already synced, it is already newer than the server's copy.
2. **A push returns `stale`.**
   - The server has already decided. Replace the local row/aggregate with the
     returned winner and mark it synced at `ack.seq`.
   - Do not compare again, do not "win" locally.
   - Unless the row/record changed since it was sent: then skip the ack and let
     the next push produce a fresh one (§4.12). A user edit is never destroyed
     by a `stale` ack.

A `stale` ack is not an error and not a reason to retry the frame. It is the
normal result of another device having a newer copy.

### 9.8 Reset workflow (pull `400` or `410`) — re-seed

This happens when the bookmark did not come from this server (400) or is older
than retained history (410). **The reset re-seeds; it never deletes.**

```
resetGroup(group, target):          # target = 0 on 400, floor on 410
  BEGIN LOCAL TRANSACTION
    bookmark = target
    for every locally synced row/record of the group
        (`*_sync_at IS NOT NULL`), including the children of a record:
      mark it dirty (`*_sync_at = NULL`), keep the row, keep its clock
    leave every dirty row/record (`*_sync_at IS NULL`) unchanged
  COMMIT
  run the normal cycle: pull from 0, then push (§9.2)
```

Why mark dirty instead of delete: the client cannot know which of its rows the
server still has, and the server cannot tell it — the log is the only
server-side copy (§0.4). Marking them dirty costs one idempotent push; deleting
them can lose the shop's only copy of a group that has no backfill (§13.4).

The re-push is cheap because the pull runs first: a row the server already has
merges as identical at merge point A and is marked synced again, so only the
rows the server genuinely lacks — or holds an older version of — are pushed.

This is the same operation as seeding (§13.4). A group is seeded by setting
`bookmark = 0` and marking every row dirty; a reset is that, triggered by a
`400`/`410`. There is one procedure to implement and to test, not two.

Rules that go with it:

- **Never bump `*_updated_at`.** The reset changes neither content nor clocks, so
  LWW still decides on real edits (§5.1.1).
- **Never delete a row or a child.** Not on `400`, not on `410`.
- **The pull still comes first** (§9.2). Pushing first would turn every row the
  server already has into a `stale`/`noop` round trip and can produce a batch
  made entirely of `stale` acks (§4.7).
- **Dirty rows survive unchanged,** as they always did.
- **`410` is `400` with a different starting point.** Both mean "this bookmark
  is useless"; both re-seed. `400` starts again at `0`; `410` starts at the
  `floor` in the error body (§15.1), because `0` is below the floor and would
  loop. Everything else — keep the rows, mark them dirty, pull then push — is
  identical, and the rows the server still holds above the floor arrive from
  the pull.
- **A reset is not a shop switch.** A device moved to a different shop (base URL
  changed) must have its local database wiped explicitly by an operator (§14.6):
  re-seeding would otherwise upload one shop's data into another, and no pull
  response can authorise or prevent that.

The accepted cost: a wipe or a restore is recovered **from the devices**, so a
row that existed only on the server does not come back (§10).

### 9.9 Group-specific client procedures

**Money**

```
deletePocket(pocket):
  BEGIN LOCAL TRANSACTION
    mark pocket deleted, bump pocket_updated_at, pocket_sync_at = NULL
    for each money under pocket:
      mark deleted, bump money_updated_at, money_sync_at = NULL
  COMMIT

applyMoneyPage(lines):
  first pass: apply all pocket lines
  second pass: apply all money lines
  for a money line whose pocket is still unknown:
    park it (persist it with the bookmark)
  at the start of every page: retry parked money rows
```

**Product**

```
rebuildStock(product_id):                      # only for products whose journal
  qty = 0; capital = 0                         # actually changed in this page
  for each event of product_id in (created_at, event_id) order:
    qty += event.product_event_value
    capital += event.product_event_capital
  write the local stock projection

uploadPendingImageBlobs():                     # after a push batch is acked
  for each image row where image_deleted_at IS NULL
                     and image_blob_sync_at IS NULL
                     and image_blob_version = image_updated_at:
    if the file no longer hashes to image_blob_sha256: image_blob_version = NULL; continue
    PUT /v2/product/image/blob/{image_id}?version={image_blob_version}
    201/200 -> image_blob_sync_at = image_blob_version
    404     -> push the row, then retry once
    409     -> adopt the server's copy (below)

fetchMissingImageBytes():                      # after the pull page commits
  need = image rows where image_deleted_at IS NULL and (no usable file
                                                       or version <> image_updated_at)
  if need is empty: return
  manifest = GET /v2/product/image/manifest   # paged; one call per cycle
  for each row in need:
    if manifest has no entry: placeholder; retry next cycle
    GET /v2/blob/{sha256} -> verify sha256 + byte_size, write *.part, rename()
    set image_blob_version, image_blob_sha256, image_blob_sync_at
```

- An image row whose file is missing is still stored; display a placeholder and
  fetch it, never fail the page.
- Deleting a product sends child tombstones in the same batch. A soft-deleted
  image is not served: the manifest lists live rows only (§8.7.1).
- Bound the blob work per cycle (for example 50 fetches / 20 uploads, smallest
  first). The next cycle continues where this one stopped, because the predicate
  is derived from the row, not from a cursor.

**Record**

```
editRecordChild(record_id, change):
  BEGIN LOCAL TRANSACTION
    apply the child change
    bump record_updated_at
    record_sync_at = NULL
  COMMIT

deleteRecord(record_id):
  BEGIN LOCAL TRANSACTION
    set record_deleted_at = now, record_updated_at = now
    record_sync_at = NULL
    keep every child row
  COMMIT

correctRecord(old):
  create a new record with the corrected data
  set new.record_pair_id = old.record_id
  soft-delete old, set old.record_pair_id = new.record_id
  push both
```

### 9.10 When to run a cycle

| trigger | typical shape |
| --- | --- |
| app start | one cycle per group |
| after a completed sale | pull the money/product/record groups, push the new rows |
| timer (e.g. every 30 s) | catches other tills' work |
| manual button | support and debugging |

Pull before push. A small backlog is what makes "resend the whole batch" cheap.

Triggers overlap: the app starts while the timer fires while a sale completes.
They must not start competing cycles — see §9.11.

### 9.11 Cycle serialisation

A group has exactly one bookmark, so **one cycle per group at a time** is part
of the client contract, not an optimisation.

- **Per-group mutex (or one sync queue).** A trigger that arrives while a cycle
  is running sets a "run again" flag; the running cycle loops once more instead
  of a second cycle starting. This is what keeps a pull page and a push ack
  batch from interleaving over the same bookmark.
- **Read the bookmark and the dirty set inside the cycle,** never in the
  trigger. A trigger captured a stale bookmark is exactly how a page gets
  skipped.
- **Groups may run in parallel, but bound it.** Two or three at a time keeps a
  slow record pull from starving the till's UI and keeps the WAL small.
- **Abort is clean.** App exit, `401`, or a network loss rolls back an open
  page/ack transaction; the bookmark stays where the last commit left it and
  the next cycle resumes there.
- **`401` stops every group,** not only the one that hit it: the device is not
  authorised, so continuing with the other eight just produces nine errors.
- **A cycle that is already pushing is never cancelled by a pull trigger**; the
  request is queued behind the running batch, so an ack transaction is never
  abandoned mid-batch.
- **Exactly one sync worker per local database.** A desktop app plus a
  background service (or two instances of the app) on the same SQLite file are
  two writers racing one bookmark; the per-group mutex only works inside one
  process. Serialise at the database (a lock row / advisory lock) or run tokens
  from one process only.

### 9.12 Recovery matrix

Every failure point, in both directions, with what is true afterwards. "Nothing"
in the server column means the request never reached the server or was rejected
whole (§4.2); the local column always describes the last **committed** state.

| failure point | server state | local state | resume action |
| --- | --- | --- | --- |
| paused / killed between cycles | unchanged | bookmark `N`, dirty set intact | normal cycle from `N` (§3.9) |
| pull lost before send | unchanged | unchanged | ask again with `N` |
| pull dies mid-stream after some `row`/`ag` lines | unchanged | page transaction rolled back; bookmark still `N` | ask again with `N`; the overlap is harmless (§3.4) |
| pull read `done`, killed before commit | unchanged | rolled back; bookmark still `N` | ask again with `N` |
| pull commit interrupted | unchanged | atomic: the whole page + `N'`, or the old `N` | continue from whatever committed |
| pull commit done, killed before the next page | unchanged | bookmark `N'` | ask with `N'` |
| push lost before send | nothing applied | rows still dirty | the next cycle re-selects them |
| push in flight, response lost | **maybe** committed (§4.2) | rows still dirty; no ack applied | re-send the same batch → `noop`/`stale` (§4.5) |
| push returns `4xx` | nothing applied | unchanged | fix and re-send; `401` stops every group |
| push returns `5xx` mid-apply | nothing applied | unchanged | backoff, re-send (§4.11) |
| ack stream dies after N of M acks | committed; all M seqs allocated | ack transaction rolled back | re-send the batch; every frame is acked again |
| acks applied, killed before commit | committed | rolled back | re-send the batch |
| acks committed, killed before the next batch | committed | synced; rows edited mid-flight still dirty (§4.12) | the next cycle; the bookmark is unchanged |
| user edits a row while its batch is in flight | committed at the sent clock | the row stays dirty; a `stale` winner is not applied (§4.12) | the next cycle pushes the newer version |
| token revoked while paused | unchanged | unchanged | `401`: stop every group, surface it (§9.11) |
| server wiped while paused | empty log, counter `0` | bookmark `> 0` | `400`: re-seed (§9.8), then pull → push |
| retention lease expired while paused | log pruned to the floor | bookmark below the floor | `410`: re-seed from `floor` (§9.8, §15.1) |
| device moved to another shop | a different shop's log | the old shop's rows | **not** a resume: wipe locally first (§14.6) |
| two processes sync the same local DB | — | two cycles race one bookmark | forbidden: one sync worker per DB (§9.11) |

Two observations make this tractable:

- **Only a pull advances a bookmark** (§4.10). A failed push can therefore never
  skip data; the worst case is re-sending a batch.
- **Every recovery action is one of five things**: retry the same request,
  re-ask the same pull, re-seed, stop on `401`, or wipe locally for a shop
  switch. There is no sixth case and no cleanup step.

### 9.13 Long pause and backlog catch-up

After a pause of hours or days the server may hold thousands of changes for a
group. Catching up is the ordinary cycle; three things need to be explicit.

**Drain the pull before pushing anything.** The pull loop (§9.2) runs to
`more: false` for the group, and only then does the push start. Pushing
mid-backlog compares against an old local copy and produces `stale` acks that
the pull would have avoided. Keep the group's default page size (§1.4) — do not
raise it to "catch up faster": a page is one transaction and one payload, and
the default is chosen to keep both bounded.

**One page at a time, one transaction each.** Memory is one page, not the
backlog, and the local database is never held for longer than a page commit.
Progress is the group's current `done.s` against `meta.snapshot` from the latest
page — an estimate, because other groups share the counter (§1.2), and useful
only as a progress bar.

**Nothing caps the number of pages.** A backlog of a week is N pages; the client
loops until `more` is false. Being interrupted is fine: each page commits
independently and the next run continues from the bookmark (§9.12).

**What may have changed while paused** — each handled by a normal path, none of
them a special case:

| change | symptom on resume | path |
| --- | --- | --- |
| token revoked | `401` | stop every group, surface "device not authorised" (§9.11) |
| server wiped / restored from an older backup | `400` | re-seed, pull, push (§9.8, §14.2) |
| retention lease expired | `410` with `floor` | re-seed from the floor (§9.8, §15.1) |
| device moved to another shop | `400`, but the log is the wrong shop | wipe locally, never re-seed (§14.6) |
| device clock moved backwards | edits made after the jump lose to newer server rows | `max(now, stored + 1)` keeps local edits ordered (§5.1.1); warn on skew (§5.6) |
| v2 enabled for a new group | that group has an empty bookmark | seed it before the first pull (§13.4) |
| record group upgraded | old records marked dirty | full refresh, not an error (§13.3) |

**Expect the first cycle after a long pause to be the slowest** — and the one
most likely to be interrupted. That is safe: the pull resumes at every page and
the push is idempotent, so a catch-up that takes three runs converges exactly as
one that takes a single run.

---

## 10. Guarantees and non-guarantees

**Guaranteed**

1. A client that stops at bookmark `N` and asks again with `N` receives every
   change above `N` — no gaps, no dependence on clocks — unless `N` is below the
   group's retention floor, which answers `410` with the floor (§15.1).
2. Re-requesting the same range returns the same entries in the same order.
3. A row/aggregate applied twice is applied once (idempotent, both directions).
4. A retried push never creates duplicate history.
5. A pull page never contains a change with a `seq` above its `meta.snapshot`.
6. Within one response, `s` values are strictly increasing.
7. An applied frame writes the row/aggregate and exactly one log entry in one
   transaction; a reader never sees one without the other.
8. A `noop` or `stale` frame writes nothing and consumes no `seq`.
9. A `stale` ack returns the winning row, or for record the winning header and
   all five child sets.
10. A record pull page always contains at least one aggregate if a change
    exists in the requested range, even if that aggregate alone exceeds the
    8 MB budget.
11. The log seq is globally ordered with every other group.
12. Image bytes are stored content-addressed: the bytes served for a hash are the
    bytes uploaded under it, and an upload is idempotent by
    `(image_id, version)` + content hash — a retry returns `200`/`deduped`, never
    a second copy (§8.7.1).
13. The manifest's `sha256` for an image is the hash of the bytes its **current**
    `image_updated_at` produced, and nothing else is served for that row.
14. A blob upload spends no `seq`, writes no log entry and moves no bookmark, so
    it can never disturb the guarantees above or a retention floor.

**Not guaranteed**

1. **Cross-group ordering.** A row/record may arrive before the other group's
   row it references. Dangling references are expected.
2. **Delivery timing.** A change is visible to another device on its *next*
   pull, whenever that happens.
3. **Exactly-once delivery.** Duplicates happen and are harmless.
4. **A row's/record's history is kept forever.** Retention is **off by default**;
   once it is enabled and a group pruned, a client below the floor gets `410`
   and can only recover from the floor up (§15.1).
5. **Clock sanity.** `*_updated_at` comes from devices; a skewed device can win
   or lose a tie.
6. **Parent-before-child on a fresh pull after concurrent pushes.**
7. **Child-level record conflicts.** The record aggregate is the unit; two
   devices cannot merge edits to different lines of the same record.
8. **Enforced record immutability.** The server accepts any newer aggregate; the
   desktop's §8.8 discipline protects the ledger.
9. **Record child array order.** It is not semantic and must not drive display.
10. **Server-only records survive a full refresh.** Records that exist nowhere
    on a client are lost when the record group is cleared.
11. **A record larger than 8 MB can sync.** It cannot be split; the desktop must
    cap record size.
12. **Image bytes at pull time.** A row can arrive before its bytes are uploaded,
    and a device without them shows a placeholder until it fetches them. The
    server also does not arbitrate two devices uploading **different** bytes for
    the **same** `(image_id, version)` — the first arrival wins and the second
    gets `409` (§8.7.1). No thumbnailing, re-encoding or server-side crop exists:
    the server stores and serves the bytes it is given.
13. **Stock rows.** `stocks` is derived from the event journal, not synced.
14. **A money row's pocket is live.** A pocket can be soft-deleted on one device
    while another creates a money row under it. The row stays live, hidden
    behind the deleted pocket, still counted in totals, and visible again if the
    pocket is restored (§6.6). The protocol never destroys it.
15. **A wiped or restored server recovers from the devices, not from itself.**
    The log is the only server-side copy. After a counter reset (admin wipe,
    restore from an older backup, re-created database) each device re-seeds on
    its next `400` and re-uploads its copy, so the shop comes back — but a row
    that existed only on the server does not.
16. **A group with no backfill is populated by a client, not by the server.**
    Until a device seeds and pushes it, the server has nothing for `money`,
    `customer`, `supplier`, `method`, `social` and `extra` (§13.4).

---

## 11. Client contract and conformance checklist

### 11.1 What the server expects from the client

1. One bookmark per group, persisted across restarts, advanced only to `done.s`.
2. A dirty flag on every synced row/entity; `NULL` means "push me".
3. Every local edit bumps the entity's `*_updated_at` and sets its dirty flag to
   `NULL` in one transaction. For record, a child edit bumps the header's
   `record_updated_at` and sets `record_sync_at = NULL`.
4. Push frames contain every dictionary column, with explicit `null`s; no
   `*_sync_at`, no `sync_seq`, no `t`.
5. The client sends only dirty rows/records, in the group's required order, and
   within the frame/byte bounds.
6. A record is sent as one complete aggregate; a record child is never sent
   alone and a record is never split.
7. Child primary keys are globally unique; none is reused under another record.
8. Deletions are soft deletes; a pocket delete also soft-deletes its money rows,
   a product delete also sends child tombstones, and a record delete keeps its
   children.
9. Money's `timestamp`, `money_value` and `pocket_id` are never changed after
   creation.
10. A record's financial/identity fields and child set are never changed after
    creation; a correction is a new record.
11. Acks are applied in order; `stale` replaces the local row/aggregate.
12. A failed batch is retried whole; the client never resumes mid-batch.
13. On pull `400`/`410`, the client re-seeds: bookmark `0` on a `400` and the
    `floor` from a `410`, every synced row marked dirty (content and clocks
    untouched), then pull and push. It never deletes a row on a reset.
14. A pull merge never bumps `*_updated_at`; a push `applied`/`noop` ack changes
    only the dirty flag. The bookmark moves only on a pull `done.s`, never on a
    push ack.
15. Cross-group references may dangle; the client never creates a cross-group
    hard FK and never fails a page for a missing one.
16. The client does not retry `401` in a loop.
17. The client sends each entity's frames only to the group that owns it.
18. The client uses the group's rolled-out reset (product bookmark, record full
    refresh) exactly.
19. One cycle per group at a time; overlapping triggers coalesce (§9.11).
20. Every local edit writes a clock strictly greater than the stored one:
    `max(now, stored + 1)` (§5.1.1).
21. TLS except against a local `DEV` server; a plain-http base URL is refused
    (§2.5).
22. `GET /v2/health` reports `protocol: 2` before any group route is called
    (§2.8, §14.1).
23. A group with no backfill is seeded before its first v2 pull (§13.4); a
    `400`/`410` re-seeds automatically, with no deletion (§9.8).
24. A live child of a soft-deleted parent is hidden and kept; nothing is
    auto-deleted (§6.6).
25. The local database is durable in the §9.4.1 sense: the bookmark and the
    rows it covers are one committed transaction.
26. A pause stops only at a commit boundary: never a partial page, never an open
    ack transaction, and the paused state is bookmark + dirty flags + parked
    rows (§3.9).
27. An ack is applied only to a row/record unchanged since it was sent; the
    client keeps `index → (id, clock)` for the in-flight batch (§4.12).
28. Exactly one sync worker per local database (§9.11).
29. A backlog is drained one page at a time, pull before push, with no page cap
    (§9.13).
30. If the client implements image bytes (§8.7.1): it pushes the row before the
    bytes, uploads only for a version the server accepted, fetches only what the
    manifest lists and only after the page commits, verifies `sha256` before
    using a downloaded file, and treats a missing blob as a placeholder rather
    than a sync failure.

### 11.2 What the client can expect from the server

1. A monotonic `seq` for every applied change; seqs are never reused or
   reordered.
2. A pull page is a contiguous range in `(bookmark, snapshot]`, in strictly
   increasing `seq`, or a shorter page with `more: true` — as long as `bookmark`
   is at or above the group's retention floor.
3. `done.s` is the last seq actually sent; re-asking from it never skips a
   change (a floor can move past it later, which is what `410` is for).
4. Re-asking the same bookmark against the same state returns the same entries
   in the same order.
5. A push batch is atomic: a `4xx`/`5xx` means nothing landed.
6. `applied`/`noop`/`stale` is one ack per frame, in the client's order.
7. `noop` and `stale` spend no seq and write no log entry.
8. A `stale` ack carries the winning row, or for record the winning header and
   all five child sets.
9. The log entry payload is the row/aggregate as stored, so a pull replays it
   byte-for-byte.
10. The server never enforces a cross-group foreign key and never invents a
    child tombstone.
11. The server rejects a malformed frame with `bad_frame` + `index`, an
    oversized batch with `413`, a bad media type with `415`, a bad token with
    `401`, and a bookmark ahead of the counter with `400`.
12. `410 too_old` is emitted only for a bookmark below a group's retention
    floor, and always carries that `floor`; with retention disabled (the
    default) it never appears.
13. A soft-deleted row/record is an ordinary `put` and is pulled/pushed like any
    other.
14. A record apply writes the header, all five child sets and one log entry in
    one transaction; a reader never sees a partial record.
15. The server does not require a cross-group reference to exist.
16. A soft-deleted parent is stored as an ordinary row; a live child under it is
    stored and pulled unchanged — the server neither cascades nor repairs
    (§6.4, §6.6).
17. The server never invents history: a pull from `0` returns only what is in
    the log, and an empty log returns `meta` + `done` (§14.2).
18. Image bytes are served content-addressed: the bytes for a hash are the bytes
    uploaded under it, the manifest lists only the blob at a live image row's
    current `image_updated_at`, and an upload is idempotent by
    `(image_id, version)` + content hash. No blob call spends a `seq` or moves a
    bookmark (§8.7.1, §12.7).

### 11.3 Per-group conformance checklist

#### General, every group

- [ ] one persisted bookmark per group; never shared between groups
- [ ] `done.s` is stored as the bookmark, never `meta.snapshot`
- [ ] one transaction per pull page; the bookmark moves with the committed rows
- [ ] never commits a page without a `done` line
- [ ] `stale` acks are merged with the same rule as a pulled row
- [ ] `*_sync_at` is set from the ack's `seq` (not from the clock)
- [ ] a local edit sets `*_sync_at = NULL` and bumps `*_updated_at` in the same
      transaction, only when a column changed, to `max(now, stored + 1)`
- [ ] soft-deleted rows are still synced; no hard delete
- [ ] on `400`/`410`: bookmark = 0 (400) or `floor` (410), mark synced rows dirty, keep everything, pull then push (§9.8)
- [ ] no cross-group hard foreign keys; dangling references tolerated
- [ ] sends each entity's frames only to the group that owns it
- [ ] one cycle per group at a time; overlapping triggers coalesce (§9.11)
- [ ] `GET /v2/health` answered `protocol: 2` before the first group request
- [ ] TLS, except against a local `DEV` server
- [ ] a group with no backfill was seeded before its first pull (§13.4)
- [ ] bookmark and rows commit together; WAL and `synchronous >= NORMAL` (§9.4.1)
- [ ] a pause happens only between commits; no partial page and no open ack
      transaction are left behind (§3.9)
- [ ] acks are compare-and-set against the clock that was sent (§4.12)
- [ ] exactly one sync worker per local database (§9.11)
- [ ] a backlog is drained page by page, pull before push, with no page cap
      (§9.13)

#### `money`

- [ ] deleting a pocket soft-deletes its money rows; never hard-deletes them
- [ ] `timestamp`, `money_value` and `pocket_id` are never edited after creation
- [ ] a note edit updates `money_note`, bumps `money_updated_at`, sets
      `money_sync_at = NULL`
- [ ] a money row whose pocket is unknown is parked, not dropped and not a page
      failure; the parked count is visible
- [ ] a money row whose pocket is soft-deleted is kept, hidden and still counted
      (§6.6)

#### `customer`, `supplier`, `method`, `social`, `extra`

- [ ] one bookmark and one dirty flag per entity
- [ ] bump `*_updated_at` and set `*_sync_at = NULL` on every real edit
- [ ] soft-delete; never hard-delete
- [ ] apply the `stale` winner, then set `*_sync_at = ack.seq`
- [ ] `method_name` may be `null`; `null` is a value
- [ ] preserve `extra_flag` bits you do not understand

#### `product`

- [ ] catalog merge is plain LWW; tie → stored wins
- [ ] event merge is insert-or-ignore by `product_event_id`; never edit an event
- [ ] stock projection is rebuilt in `(created_at, id)` order, not pull order
- [ ] `stock_id` is stored, never joined; `record_id` may dangle
- [ ] image rows apply even when the file is missing (placeholder)
- [ ] deleting a product sends child tombstones in the same batch
- [ ] a child created after the delete is kept, hidden, and reappears on restore
      (§6.6); events are never hidden or deleted
- [ ] `listing_code` is `null`, never `""`

#### `product` — image bytes (only if the client implements §8.7.1)

- [ ] the three client-only blob columns exist on `images`, and a pull merge
      leaves them untouched (§5.8)
- [ ] files are keyed by `image_id`, written `*.part` + `rename()`, and verified
      against `sha256` + `byte_size` before the rename
- [ ] an upload runs only after its row's push is acked, and never for a version
      that came back `stale`
- [ ] a downloaded blob sets `image_blob_sync_at`, so it is never re-uploaded
- [ ] `409 blob_conflict` clears `image_blob_version` and fetches the winner; it
      never overwrites and never bumps `image_updated_at` in a loop
- [ ] the manifest is called at most once per cycle, and only when some row needs
      a fetch
- [ ] fetches and uploads are bounded per cycle, smallest first
- [ ] a missing blob is a placeholder, never a page failure and never a reason to
      stall the bookmark

#### `record`

- [ ] `record_sync_at` on the header only; the five child tables have no sync
      flag
- [ ] any header or child edit bumps `record_updated_at` and sets
      `record_sync_at = NULL`
- [ ] push sends the whole aggregate: header + all five child arrays, including
      children of soft-deleted records
- [ ] batch by frames **and** bytes: ≤1000 frames, ≤8 MB
- [ ] never splits one record across frames or requests
- [ ] surfaces a record that alone exceeds 8 MB; does not silently skip it
- [ ] `stale` acks are applied as the winner, unless the record changed since it was sent (§4.12)
- [ ] child arrays are sets keyed by primary key; order is not semantic
- [ ] child primary keys are globally unique
- [ ] never hard-deletes a record or child; soft-delete the record, keep children
- [ ] financial/identity fields and the child set are not changed after creation;
      a correction is a new record
- [ ] on upgrade: `record_bookmark = 0`, `record_sync_at = NULL` for every local
      record, keep the rows and children, then sync

---

## 12. Server implementation requirements

### 12.1 The log writer

The append function is the only place a seq is allocated and a log entry is
written. It must run in the **same transaction** as the row/aggregate write:

- allocate `seq` from `sync_seq_counter`;
- write the row(s) with `sync_seq = seq`;
- append one `put` entry with the row/aggregate as stored.

A reader must never see one without the other. The server's own bookkeeping never
crosses the wire.

### 12.2 Batch atomicity

- One push request is applied atomically: a `4xx`/`5xx` must mean nothing from
  that batch is visible.
- Parsing and all `bad_frame` validation happen before the apply transaction.
- A bounded batch (1000 frames / 1 MB, record 8 MB) keeps the transaction short
  enough not to block other clients.

### 12.3 Pull correctness

- Read the counter **once** per response; everything `<= snapshot` is stable.
- Reject a bookmark ahead of the counter with `400`.
- Read the page before streaming it; emit `meta`, then entries in `seq` order,
  then `done`.
- `done.s` is the last emitted seq, not the snapshot.
- `more` is true iff a change exists above `done.s` within the snapshot.
- A page never contains a gap.
- For record: respect the 8 MB payload budget but always include at least one
  aggregate; `more` is computed from the group's log, not from `last < snapshot`.

### 12.4 Per-merge-kind rules

- Plain LWW: compare the entity's `*_updated_at`; tie → stored.
- Money: compare the immutable fields before the clock; build the accepted row
  from the stored immutable columns + the accepted note/deleted flag.
- Product event: insert if absent; `noop` if present, regardless of payload.
- Record: replace the header and all five child sets; validate global child key
  ownership before writing; one log entry per aggregate; stream acks.

### 12.5 Tests that must exist

Unit:

- merge decisions for every kind: new, identical, newer, tie, older;
- money immutable-field conflict;
- product event replay;
- record `sameAggregate` header/child/reorder/null-vs-empty/numeric equality;
- parser: every column required, every type, empty PK, `listing_code: ""`,
  unknown entity, missing/unknown `ch`, duplicate child PK, stolen child PK;
- log encode: row and aggregate payloads, `del`;
- record page byte budget;
- ack encode: `applied`/`noop`/`stale`, record `row` + `ch`.
- retention: the floor rule (min over live tokens, lease expiry, no live client,
  a never-pulled device pinning `0`, clamp to the counter), the pull guard's
  `410` + `floor`, and the pruner (boundary at the floor, idempotent re-run,
  floor never going backwards, dry run, bookmark sweep);
- image bytes: mime sniffing per format, the streamed size bound, `MAX(version)`
  selection in the manifest, `recordBlob`'s inserted/same/conflict outcomes,
  object dedupe across two images, and the GC plan (superseded, deleted image,
  unreferenced object, grace window, current version never collected).

Client-side rules are not unit-testable on the server; §16.5 is the vector set a
desktop suite encodes (merge decisions, page/bookmark edges, ack compare-and-set,
the clock rule, reset/retention/orphans).

Integration:

- pull: one page, paging, empty page, bookmark ahead, auth, gzip;
- push: each group, mixed batch, `stale` carries the winner, event replay,
  bounds, `415`, `401`;
- record: child replacement, soft delete, stolen child atomicity, full refresh
  reset script;
- image bytes: upload → `201` then `200`/`deduped`, `409 blob_conflict` for
  different bytes at the same `(image_id, version)`, `404 image_unknown` before
  the row exists, `409 image_deleted`, `413`, `415` (header and magic bytes),
  `400 empty_blob`, download with `ETag`/`304`, `500 blob_lost` when the file
  vanished, the manifest listing the current version only, and **the counter
  unchanged by every blob call**;
- docs: OpenAPI has both paths and every row/aggregate schema.

### 12.6 Admin and schema

- every group log is included in `DELETE /v2/admin/data`, together with
  `client_bookmark` and `group_retention`, so a wipe resets the floors too;
  a wiped database answers a stale bookmark with `400`, never `410`;
- the record child tables are deleted before `records` in the prune;
- the blob tables are deleted too — `image_blob` before `blob_object` (the FK) —
  but the **files are not**: a wipe leaves them for `bun run blobs:audit
  --delete`, because deleting files inside the transaction would make a rollback
  a lie (§12.7);
- the OpenAPI document describes every v2 path and every dictionary.

### 12.7 Image bytes

- **Two tables, no `seq`.** `blob_object (sha256 PK, byte_size, mime,
  created_at)` and `image_blob (image_id, version, sha256, uploaded_at)` with
  `PRIMARY KEY (image_id, version)`. Neither has `sync_seq`, and no write to them
  allocates a seq, appends a log entry or touches `client_bookmark`. Assert that
  in a test: a blob upload must leave the counter unchanged.
- **One FK, and one deliberate absence.** `image_blob.sha256` references
  `blob_object.sha256` (so the collector cannot remove bytes a claim still
  points at). There is **no** FK from `image_blob.image_id` to `images`: a
  concurrent push may land a child first, and a constraint would turn that legal
  ordering into a `500`. The upload route checks the row itself.
- **Files.** `<BLOB_DIR>/<sha256[0:2]>/<sha256>`, staged in `<BLOB_DIR>/tmp/`.
  `tmp/` is inside `BLOB_DIR` because `rename()` is only atomic within one
  filesystem. Configuration: `BLOB_DIR` (default `data/blobs`), `BLOB_MAX_BYTES`
  (default 8 MB), `BLOB_GC_DAYS` (default 7).
- **Crash order.** The file is written (staged, then renamed into place)
  **before** the row that names it, and deleted **after** the row is deleted. A
  crash then leaks bytes — reclaimable — and never leaves a row pointing at a
  missing file, which would be a `500` no client could fix.
- **Streaming and bounds.** The upload body is hashed and written as it arrives,
  refusing at `BLOB_MAX_BYTES + 1` bytes; the body is never buffered whole. The
  mime is sniffed from the magic bytes (png/jpeg/webp) and the request header is
  advisory.
- **Dedupe.** Content addressing means the same file for two images is one
  object with two claims. On `409 blob_conflict` the losing upload's object is
  dropped again unless another image shares it, and its file is unlinked with it.
- **The manifest is a join, not a log.** One entry per live `image` row whose
  blob version equals its `image_updated_at`; paged by `image_id`; no `ETag`, no
  bookmark, no ordering meaning. Two calls may differ because an upload landed.
- **Collection.** `bun run db:prune-blobs` (`--dry-run`, `--json`) deletes
  superseded claims, claims of deleted images, and unreferenced objects (then
  their files), all older than `BLOB_GC_DAYS`, in two steps: claims first, then
  the objects that just lost their last claim. The blob at a live image's current
  version is never collected. `bun run blobs:audit` (`--delete`, `--json`)
  reports leaked files, `lost` rows and leftover scratch files.

---

## 13. Rollout and backfill

### 13.1 What the server serves

Every synced table belongs to exactly one of the nine v2 groups:

| group | entities |
| --- | --- |
| money | `pocket`, `money` |
| customer | `customer` |
| supplier | `supplier` |
| method | `method` |
| social | `social` |
| extra | `extra` |
| product | `product`, `product_name`, `property`, `listing`, `image`, `product_event` |
| combo | `combo` (with `combo_listings`, `combo_extras`, `combo_discounts` inside the aggregate) |
| record | `record` (with its five child sets inside the aggregate) |

A group's pull emits only that group's entities, and its push rejects a frame
whose entity belongs to another group with `400 bad_frame`
(`unknown entity "…"`). That is deliberate: a device sees a gap, not a
half-migrated stream.

The `product` group additionally serves image **bytes** (§8.7.1) from
`blob_object` / `image_blob`. Those tables are not a group: they have no log, no
bookmark and no seq, so they are never listed in the table above and never
appear in a pull page.

### 13.2 Product backfill

The product group is the only group with a backfill today.

```
bun run db:backfill-product
```

- Run **after** the migration and **before** the backend serves `/v2/product/*`.
- Seeds one `put` entry per existing row, in dependency order:
  `product` → `product_name` → `property` → `listing` → `image` →
  `product_event`.
- Uses the row's **existing `sync_seq`** as the log `seq`, preserving the
  original order and the counter. If that seq is already taken by a push, a
  fresh seq is allocated.
- Idempotent: a `(entity, row_id)` already in the log is skipped.
- A client can initialise `product_bookmark` from its existing cursor instead
  of re-pulling the whole catalog. A fresh client uses `0`.

**When the journal joined an existing catalog group:** a client whose
`product_bookmark` already advanced past older event seqs must reset
`product_bookmark = 0` once and re-pull the group. The merge is idempotent
(LWW + insert-or-ignore), so this is safe.

**Image bytes need no backfill.** There is nothing to seed: a blob exists only
once a device uploads it, and the client's bookkeeping is derived from the row's
`image_updated_at`, not from a cursor. The first cycle after the blob half ships
uploads what the device has and fetches what it lacks (§8.7.1) — no reset, no
migration, no operator step.

### 13.3 Record full refresh (no backfill)

The record group deliberately has **no backfill**. It is rebuilt by a full
refresh:

1. **Clear the server's record group** if it already has rows:
   ```
   bun run db:reset-record
   ```
   This deletes the five child tables, `records`, and
   `record_group_change_log` in one transaction. It does **not** reset
   `sync_seq_counter` and does not touch other groups or tokens.

   This step is mandatory if the server's records predate the group log.
   Without it, a client's initial full push is `noop` for the records that
   match the server's copy; those records never enter the log and other devices
   never see them.

2. **Upgrade each desktop:** set `record_bookmark = 0` and mark every local
   record dirty (`record_sync_at = NULL`). Do **not** bump `record_updated_at`;
   the existing clocks are what the LWW merge should use. Do not delete local
   records or children. They repopulate the server.

3. **Sync each device**: pull from 0, push every dirty record, final pull.
   The first device repopulates the server; later devices merge by LWW and push
   their own records. The union is preserved record by record.

**What is lost:** records that exist only on the server and on no client. This is
the accepted cost of no backfill. Make sure at least one device with the shop's
full history syncs after the wipe.

**Do not use** `DELETE /v2/admin/data` for a record-only refresh: it wipes every
group and resets the counter, invalidating every other group's bookmark.

### 13.4 Simple groups: no backfill, **by design**

`money`, `customer`, `supplier`, `method`, `social` and `extra` have **no
backfill**, and that is a decision, not a gap or a pending task:

- the desktop is the source of truth for these tables; the server is a meeting
  point, not a second database that decides what the shop has;
- a backfill would need a per-group script, a rollout window and a "which device
  is right" decision the server cannot make — while seeding a device needs
  neither a migration nor downtime;
- seeding is exact and idempotent: LWW plus soft delete already make a re-push
  harmless, so the one-time cost is a single push per group.

**Seeding is the only population mechanism.** On a client, for each of these
groups, before the first v2 pull and before anything can reset it:

```
BEGIN LOCAL TRANSACTION
  <group>_bookmark = 0
  for every row of the group: <entity>_sync_at = NULL    # dirty, keep the clock
COMMIT
```

- do **not** bump `*_updated_at`: the existing clocks are the ordering the LWW
  merge should use (§5.1.1);
- do **not** delete anything;
- then run the normal cycle: pull from `0` (usually empty), push everything,
  final pull (§9.2).

**Rows that arrived over an older transport.** A row carrying a non-`NULL`
`*_sync_at` reads as "already synced" and would never be pushed. The seeding
block above is exactly the procedure for such a device: bookmark `0` and every
row dirty. Skipping it leaves the group permanently empty on the server and
empty on every other device.

**The consequence, stated plainly.** The log is the only server-side copy of a
non-backfilled group, so:

1. a fresh server sees empty groups until a device seeds them;
2. a counter reset — admin wipe, restore from an older backup, re-created
   database — empties the log while every client bookmark is still above it;
3. each device then gets a pull `400` and **re-seeds** (§9.8): bookmark `0`,
   every synced row marked dirty, nothing deleted, then pull (empty) and push.

The shop is therefore recovered from the devices: the seeding block above and
the reset are the same operation, triggered differently. A row that existed only
on the server is the one thing that does not come back.

A backfill remains *technically* allowed (§15.2). It is not planned.

---

## 14. Operations

### 14.1 Health and tokens

| route | credential | purpose |
| --- | --- | --- |
| `GET /v2/health` | public | `{ protocol: 2, status: "ok" }` |
| `POST /v2/admin/tokens` | admin password | mint a device token (shown once) |
| `GET /v2/admin/tokens` | admin password | list tokens (never the raw value or digest) |
| `DELETE /v2/admin/tokens/:id` | admin password | revoke a token |
| `POST /v2/admin/tokens/inspect` | admin password | resolve a raw token to its row |

The admin password is stored only as a PBKDF2-SHA256 hash (`ADMIN_SECRET`).

### 14.2 Admin data

| route | purpose |
| --- | --- |
| `GET /v2/admin/overview` | row counts per sync table, cursor, token count, retention floors |
| `GET /v2/admin/logs` | filtered, cursor-paginated request log |
| `GET /v2/admin/logs/export` | filtered log as NDJSON or CSV |
| `DELETE /v2/admin/logs` | prune the request log |
| `DELETE /v2/admin/data` | prune every sync table, every group log and the blob tables; reset the seq counter to 0; keep tokens |

`DELETE /v2/admin/data` is the operator's "start over" switch. It deletes, it
does not restore: every sync table, every group log, the blob tables
(`image_blob` then `blob_object`) go, and the seq counter returns to 0. The tokens are kept, because pruning data is not de-provisioning.
The blob **files** on disk are not deleted by the wipe — the route is one
transaction and a rollback must not have already unlinked anything. Run
`bun run blobs:audit --delete` afterwards to reclaim them (§12.7).

What happens next, in order: every client's bookmark is now above the counter,
so each client's next pull is `400 bad_request`; the client then **re-seeds**
(§9.8) — bookmark `0`, every synced row marked dirty, **nothing deleted** — pulls
the empty log and pushes its copy back. The shop is re-uploaded from the
devices, group by group, and LWW settles the merge between them.

**A wipe is therefore recoverable, with two caveats:**

- rows that existed only on the server are gone (the same cost as the record
  full refresh, §13.3), so the shop's history must live on at least one device;
- devices re-upload in the order they happen to sync, so expect a burst of
  pushes and a temporarily busier log. No device has to be taken offline and no
  step has to be scheduled: whichever device pulls first becomes the seed, and
  the rest merge into it.

The counter reset is deliberate: leaving it high would let every device pull
successfully forever and never learn that the data is gone.

Do not use this route for a record-only refresh (§13.3) and do not use it as a
"clear one group" tool: both cases invalidate every other group's bookmark.

### 14.3 Migrations and scripts

Migrations auto-apply on server start. One log table per group:

| migration | log |
| --- | --- |
| `0006_money_group_change_log.sql` | `money_group_change_log` |
| `0007_customer_group_change_log.sql` | `customer_group_change_log` |
| `0008_supplier_group_change_log.sql` | `supplier_group_change_log` |
| `0009_method_group_change_log.sql` | `method_group_change_log` |
| `0010_social_group_change_log.sql` | `social_group_change_log` |
| `0011_product_group_change_log.sql` | `product_group_change_log` |
| `0012_record_group_change_log.sql` | `record_group_change_log` |
| `0013_extra_group_change_log.sql` | `extra_group_change_log` |
| `0014_retention.sql` | `client_bookmark`, `group_retention` (§15.1) |
| `0016_image_blobs.sql` | `blob_object`, `image_blob` — the image-byte side channel (§12.7) |

Scripts:

| script | purpose |
| --- | --- |
| `bun run db:migrate` | apply migrations only |
| `bun run db:backfill-product` | seed the product log from existing rows (§13.2) |
| `bun run db:reset-record` | clear the record group for the full refresh (§13.3) |
| `bun run db:prune-history` | prune group logs to the retention floor; `--dry-run`, `--json` (§15.1) |
| `bun run db:prune-blobs` | collect superseded/deleted/unreferenced image bytes past the grace window; `--dry-run`, `--json` (§12.7) |
| `bun run blobs:audit` | compare the blob tables with `BLOB_DIR`: leaked files, `lost` rows, scratch files; `--delete`, `--json` (§12.7) |
| `bun run db:reset` | delete and recreate the local database (destructive) |

### 14.4 Code map

```
src/protocol/entities.ts        every entity's columns, PK, clock and kind
src/protocol/canonical.ts       canonical JSON + row/aggregate envelopes
src/v2/<group>-log.ts           log writer, pager and wire encoding
src/v2/<group>-merge.ts         the pure merge rule
src/v2/<group>-push.ts          parsing + atomic apply
src/v2/product-backfill.ts      one-time product log seed
src/v2/retention.ts             observed bookmarks, floor rule, pruner
src/v2/blob-store.ts            image bytes on disk: content addressing, sniff, staging
src/v2/blob-index.ts            blob_object/image_blob, the manifest join
src/v2/blob-gc.ts               blob collector and disk audit
src/routes/v2-<group>.ts        pull/push endpoints
src/routes/v2-blob.ts           the three image-byte routes
src/routes/admin-*.ts           tokens, overview, logs, data prune
scripts/prune-history.ts        the operator path for retention
scripts/prune-blobs.ts          the operator path for image-byte collection
scripts/blobs-audit.ts          the operator path for a disk/table disagreement
migrations/*_group_change_log.sql
migrations/0014_retention.sql   client_bookmark + group_retention
migrations/0016_image_blobs.sql blob_object + image_blob
public/openapi.yaml             the HTTP reference (token-gated)
```

### 14.5 Tests

```
bun run typecheck
bun test test/unit
bun run test:integration
```

The integration suite spawns a real Bun server on a temp database, so the tests
cover the wire, auth, gzip, paging, batch bounds, the record aggregate and the
image-byte side channel (upload/download/manifest against a temp `BLOB_DIR`) end
to end.

### 14.6 Deployment and security invariants

- **One shop per server instance.** Tokens carry no shop, group or role: any
  valid token reads and writes every group of the instance. Two shops on one
  server merge their ledgers irreversibly, with no way to separate them again.
  Run one instance per shop.
- **TLS is mandatory.** The bearer token is a full credential. Terminate TLS at
  the edge (README §"Public access") and never expose the plain-HTTP listener to
  a network that is not the shop's own.
- **One token per device,** labelled with the device name, revocable
  individually. Rotation = mint, move the device, revoke the old token.
  Revocation is immediate in the revoking process and within 60 s elsewhere (the
  token-cache TTL, §2.5).
- **Tokens never expire.** There is no `expires_at`; a lost device is revoked,
  not expired. Expiry is an open item (§15.11).
- **Rate limiting is the edge's job.** The API answers `401` cheaply and does not
  throttle sync requests. Bound `POST /v2/*/push` and repeated `401`s at the
  proxy/tunnel/WAF (§2.5).
- **A backup is only consistent with the counter it contains.** Restoring an
  older backup leaves the counter below the clients' bookmarks; each device then
  re-seeds on `400` and re-uploads its copy (§9.8), so the shop converges again
  minus whatever existed only in the lost tail of the log.
- **One writer.** Bun's SQLite connection is synchronous and single-process;
  `busy_timeout = 5 s` covers a stray reader, not a second server. Scaling out
  needs a different store, not another replica of this one.
- **`DEV=true` is local only.** It suppresses response compression and nothing
  else; it must never be set on the public deployment, and a client must never
  accept a plain-http base URL outside local development.
- **Retention is opt-in and has an onboarding cost.** `RETENTION_LEASE_DAYS=0`
  (the safe default) keeps every log complete and is what a fresh deployment
  should run. Enabling it means "enrol every device first": a device enrolled
  after the first prune starts at `0`, below the floor, and cannot bootstrap
  without a snapshot endpoint (§15.1, §15.15). The overview reports every
  floor, so the decision can be made from data.
- **Moving a device to another shop is a local wipe, not a re-seed.** If the base
  URL changes to a different instance, the device's rows belong to the old shop:
  a reset would upload them into the new one as if they were its data. Wipe the
  local database (operator action) before pointing the device at another
  instance. No pull response can detect or prevent this (§9.8).
- **The request log is not the sync log.** `docs/LOGS.md` describes the
  operational log; it is a separate store with its own retention and is never
  used to replay a pull.

---

## 15. Open items

1. **Retention — implemented; the open item is onboarding a new device.**
   History is kept forever until an operator opts in. When it is on:

   - **What is recorded.** Every pull upserts `(token_id, group_name, last_seq,
     last_seen_at)` into `client_bookmark`, with `MAX` on `last_seq` so progress
     is monotonic. Enrolment writes `last_seq = 0` for all nine groups, so a
     device that has never pulled pins its groups at `0`; revoking the token
     cascades those rows away and releases the pin.
   - **The floor.** `floor = min(last_seq)` over the tokens whose `last_seen_at`
     is inside `RETENTION_LEASE_DAYS` (default 30; `0` disables retention
     entirely). A group with **no live client is never pruned**. The floor is
     stored per group in `group_retention` and is monotonic: it never goes
     backwards, even when a new device enrols at `0`.
   - **The prune.** `bun run db:prune-history` deletes `seq <= floor` from each
     group's log in one transaction per group and records the floor. It never
     touches entity tables, other groups, tokens or the counter. `--dry-run`
     reports what would go; `--json` prints the report.
   - **The pull.** `after < floor` answers `410 too_old` with `floor` in the
     error body. `after == floor` is served normally: the client has consumed
     everything at or below it. The client re-seeds **from the floor** (§9.8) —
     never from `0`, which is below the floor and would loop.
   - **The lease is the product's "maximum offline time".** A till offline
     longer than the lease stops holding the log back, and re-seeds when it
     returns.
   - **The open item.** A device enrolled *after* the first prune starts at
     bookmark `0`, below the floor, and there is no snapshot endpoint to
     bootstrap it — the log is the only copy (§13.4). So the rule is "enrol
     every device before enabling retention", and joining a pruned shop needs a
     log rebuild (clear that group's log, re-seed it from a device, §13.3). A
     `GET /v2/<group>/snapshot` would remove the constraint (see 15 below).
2. **Simple-group backfill (decided: not planned).** `money`, `customer`,
   `supplier`, `method`, `social` and `extra` have no backfill **on purpose**
   (§13.4): the desktop is the source of truth and seeding a device is exact,
   idempotent and needs no migration. A backfill remains technically allowed
   and would seed one `put` per current row, in id order, using the existing
   `sync_seq` (the product group's pattern); it is not on the roadmap.
3. **Record client.** The server side of the record group is implemented; the
   desktop client still needs the aggregate push/pull, the header-only dirty
   flag, the child-ownership checks, and the full-refresh upgrade.
4. **Record full-refresh tooling.** `db:reset-record` is the operator path. A
   scoped `DELETE /v2/admin/data/record` would be a convenience, not a protocol
   change.
5. **Record max size.** A record over 8 MB cannot be sent. The desktop must cap
   record size and surface the error. A future protocol revision could raise the
   bound.
6. **Image-byte client.** The server half of §8.7.1 is implemented: the three
   routes, `blob_object`/`image_blob`, the collector and the audit. The desktop
   still needs the three client-only columns, the upload queue (after the row's
   ack) and the fetch loop (manifest, then `GET` per hash, `*.part` + `rename()`),
   plus the bounded work per cycle. Until that ships a restored device shows
   placeholders, which is a degraded but correct state — no row is lost and the
   bookmark never waits on bytes. `docs/SYNC-V2-PRODUCT.md` §19 is the design
   record; §8.7.1 above is the normative statement.
   Two things are deliberately out of scope and should stay that way: an inline
   `blob` frame (base64 in the log) and server-side image processing
   (thumbnails, re-encode, crop).
7. **`stocks` as a synced row (rejected).** `stocks` stays derived from the
   event journal. Syncing both as independent LWW entities would let them
   disagree.
8. **Product journal split.** If event volume makes the shared bookmark
   expensive, `product_event` can move to its own `stock` group. The rows and
   merge rules stay the same; only the endpoint and bookmark change.
9. **Per-child record sync (rejected).** Records are immutable aggregates. A
   flat child model would need child clocks, dirty flags and a different merge
   rule; it is a different group, not a tweak.
10. **Cross-group reference validation.** The server does not validate
    `record_listings.product_id`, `product_event_id`, `record_methods.method_id`,
    `record_supplier_id` or `record_pair_id`. Do not add such a check: it would
    make a record unsyncable whenever another group lags.
11. **Token expiry.** There is no `expires_at` today (§2.5, §14.6). An expiry
    would let a stolen device token die on its own, but it must not surprise a
    till that was offline for weeks, so it needs a long window plus a
    re-enrolment path. Rotation stays manual until then.
12. **Server-side rate limiting.** `401` and pulls are unthrottled (§14.6). If
    the edge cannot enforce a bound, a per-token token-bucket in the app is the
    next step. It is a deployment protection, not a protocol rule.
13. **Orphan visibility.** §6.6 keeps a live `money` row under a deleted pocket
    and a live product child under a deleted product. The protocol deliberately
    does not delete them; the desktop needs a view for them, next to the parked
    money rows of §7.5, so they are never invisible.
14. **Conditional requests.** `GET /v2/health` and pulls have no `ETag`. A shop
    polling every 30 s sends a `meta`+`done` page per group per tick; if that
    ever matters, an `If-None-Match` on an empty page is the cheap fix.
15. **A snapshot endpoint, for onboarding a device into a pruned shop.**
    `GET /v2/<group>/snapshot` would stream the current rows at a `snapshot`
    seq, pageable by primary key, and hand the client that seq as its bookmark.
    That is what makes retention compatible with a brand-new device: today such
    a device starts at `0`, below the floor, and the log cannot help it
    (§15.1). The rows are already in the entity tables; the work is paging,
    the `done` contract and client support, not a new merge rule.

---

## 16. Appendices

### 16.1 Limits

| limit | money / customer / supplier / method / social / extra / product | record |
| --- | --- | --- |
| pull `limit` default | 5000 entries | 1000 entries |
| pull `limit` max | 20000 entries | 5000 entries |
| pull page payload budget | — | 8 MB (8 × 1024 × 1024) |
| push batch | 1000 frames / 1 MB uncompressed | 1000 frames / 8 MB uncompressed |
| one push frame | a row | an aggregate, up to 8 MB (leave room for the line terminator) |
| seq range | 1 … 2^63 | 1 … 2^63 |

Image bytes are not frames, so they have their own bounds (§8.7.1):

| limit | value |
| --- | --- |
| one upload body | `BLOB_MAX_BYTES`, default 8 MB, enforced while streaming |
| upload `Content-Type` | `image/png`, `image/jpeg`, `image/webp` — sniffed, not trusted |
| upload `Content-Encoding` | `identity` only |
| manifest page | 5000 default / 20000 maximum entries |
| GC grace (`BLOB_GC_DAYS`) | 7 days |

### 16.2 Error codes

| code | HTTP | endpoint | meaning |
| --- | --- | --- | --- |
| `bad_request` | 400 | pull, blob upload, blob download | bad `:seq`, a bookmark ahead of the server, a bad `version`/`:sha256` |
| `bad_frame` | 400 | push | a line is invalid; `index` says which |
| `unauthorized` | 401 | every route | missing/unknown/revoked token |
| `not_found` | 404 | every route | wrong path or unknown route |
| `too_old` | 410 | pull | bookmark below the group's retention floor; the body adds `floor`, the lowest seq still served |
| `payload_too_large` | 413 | push, blob upload | batch over the group's frame/byte bound, or a blob over `BLOB_MAX_BYTES` |
| `unsupported_media_type` | 415 | push, blob upload | bad `Content-Type`/`Content-Encoding`, or blob bytes that are not png/jpeg/webp |
| `empty_blob` | 400 | blob upload | a zero-byte body |
| `image_unknown` | 404 | blob upload | no such `image` row yet — push the row first (§8.7.1) |
| `image_deleted` | 409 | blob upload | the `image` row is soft-deleted — drop the upload |
| `blob_conflict` | 409 | blob upload | different bytes already own this `(image_id, version)`; the body adds the winner's `sha256` |
| `blob_missing` | 404 | blob download | no object with that hash — refresh the manifest |
| `blob_lost` | 500 | blob download | the object is catalogued but its file is gone: server-side fault |
| `internal` | 500 | every route | server fault |
| `service_unavailable` | 503 | every route | **not emitted by this server**; an edge, proxy or a future version may. Treat it as any `5xx` (§4.11) |

There are no replay, offset or session codes. A `408`/`502`/`504` from an
intermediary is likewise a `5xx` for the retry policy: retry, never shrink or
drop the batch.

### 16.3 Column dictionary index

| entity | table | PK | columns |
| --- | --- | --- | --- |
| `pocket` | `pockets` | `pocket_id` | 6: id, name, type, ordering, updated_at, deleted_at |
| `money` | `money` | `money_id` | 7: id, timestamp, value, pocket_id, note, updated_at, deleted_at |
| `customer` | `customers` | `customer_id` | 5: id, name, phone, updated_at, deleted_at |
| `supplier` | `suppliers` | `supplier_id` | 5: id, name, note, updated_at, deleted_at |
| `method` | `methods` | `method_id` | 5: id, name?, kind, updated_at, deleted_at |
| `social` | `socials` | `social_id` | 5: id, name, value, updated_at, deleted_at |
| `extra` | `extras` | `extra_id` | 7: id, name, value, kind, flag, updated_at, deleted_at |
| `product` | `products` | `product_id` | 6: id, name, note, flag, updated_at, deleted_at |
| `product_name` | `product_names` | `product_name_id` | 5: id, product_id, value, updated_at, deleted_at |
| `property` | `properties` | `property_id` | 5: id, product_id, key, value, updated_at, deleted_at |
| `listing` | `listings` | `listing_id` | 9: id, product_id, name, price, unit, kind, code?, updated_at, deleted_at |
| `image` | `images` | `image_id` | 7: id, order, name, mime, product_id, updated_at, deleted_at |
| `product_event` | `product_events` | `product_event_id` | 8: id, created_at, value, capital, note, product_id, stock_id?, record_id? |
| `combo` | `combos` | `combo_id` | 7: id, name, active, cover_name?, cover_mime?, updated_at, deleted_at |
| `combo_listings` | `combo_listings` | `combo_listing_id` | 5 inside the aggregate: id, listing_id, qty, order |
| `combo_extras` | `combo_extras` | `combo_extra_id` | 4 inside the aggregate: id, extra_id, order |
| `combo_discounts` | `combo_discounts` | `combo_discount_id` | 5 inside the aggregate: id, combo_listing_id, value, kind, order |
| `record` | `records` | `record_id` | 20: see §8.8 |
| `record_listings` | `record_listings` | `record_listing_id` | 11: see §8.8 |
| `record_methods` | `record_methods` | `record_method_id` | 3: id, method_id, pay |
| `record_extras` | `record_extras` | `record_extra_id` | 6: id, name, value, eff, kind, flag |
| `record_images` | `record_images` | `record_image_id` | 4: id, order, name, mime |
| `discounts` | `discounts` | `discount_id` | 6: id, group_id, record_listing_id, kind, value, eff |

`?` means nullable on the wire. Every row carries every column; `null` is
explicit.

`blob_object` and `image_blob` are **not** in this index: they are not synced
entities, they have no wire dictionary and they never appear in a pull page
(§8.7.1, §12.7). Their columns are a server storage detail.

### 16.4 Manual verification

A minimal operator check, in plain English:

1. Start with an empty database. Pull any group from `0`: the response is
   `meta` then `done`, with no rows, and the bookmark stays `0`.
2. Push one valid frame. The response is one `ack` with `applied` and a `seq`,
   then `done`.
3. Push the identical frame again. The response is one `ack` with `noop` and
   the same `seq`; no new history.
4. Pull from `0`. The row/aggregate comes back in `seq` order, and `done.s` is
   the new bookmark.
5. Pull from a bookmark greater than the server's counter. The response is
   `400 bad_request`.
6. Pull without a token. The response is `401 unauthorized`.
7. Push a record aggregate with a missing `ch` key. The response is
   `400 bad_frame` with `index`, and nothing landed.
8. Push a batch over the group's bound. The response is
   `413 payload_too_large`.
9. Send an unsupported `Content-Encoding`. The response is
   `415 unsupported_media_type`.
10. Push the same batch twice with a body that has no final newline and one
    blank line: both answers are identical in meaning, the blank line is not a
    frame, and no extra history is written (§2.9).
11. Push a frame that differs from the stored row but carries the same
    `*_updated_at`. The answer is `stale` with the stored row — this is why the
    client must use `max(now, stored + 1)` (§5.1.1).
12. Soft-delete a pocket, then push a live `money` row for it from a second
    device. Pull from `0`: both rows are present, the pocket deleted, the money
    live. Nothing was cascaded and nothing was invented (§6.6).
13. Restore the pocket (a newer `pocket_updated_at`, `pocket_deleted_at: null`)
    and pull: the money row is visible again (§6.6).
14. Wipe the server (`DELETE /v2/admin/data`). A device's next pull is
    `400 bad_request`; it re-seeds, pulls the empty log and pushes its copy
    back, and a second device pulls the shop from that log. No client deleted a
    row in the process (§9.8, §14.2).
15. Push a batch, then edit one of its rows before the ack is read. The ack for
    that frame is skipped: the row stays dirty, the next push carries the newer
    clock, and the server applies it. Repeat with a `stale` winner — the local
    edit is not overwritten (§4.12).
16. Pause (kill the client) while a pull page is streaming, and while a push
    request is in flight. In both cases the restart resumes from the last
    committed bookmark, the pull re-fetches the page, and the push re-sends the
    batch to `noop`/`stale` (§3.9, §9.12).
17. Enable retention (`RETENTION_LEASE_DAYS=1`), pull a group to its end, then
    run `bun run db:prune-history`. A pull from a bookmark below the floor is
    `410` with `floor`; a pull from `floor` is a normal page; `--dry-run`
    changes nothing (§15.1).
18. `PUT` an image's bytes before its row exists: `404 image_unknown`. Push the
    `image` row, `PUT` again: `201` with a `sha256`. `PUT` the same bytes again:
    `200` with `deduped: true` (§8.7.1).
19. `PUT` **different** bytes for the same `(image_id, version)`: `409
    blob_conflict`, and the body names the stored `sha256`. `GET` that hash: the
    first bytes, unchanged.
20. `GET /v2/product/image/manifest`: one entry for the row, at its
    `image_updated_at`. Bump `image_updated_at` with a push and pull the
    manifest again: the entry is **gone** until the new version is uploaded —
    the old bytes are not served for a changed row.
21. `GET /v2/blob/{sha256}`: the exact bytes, `ETag` = the hash; repeat with
    `If-None-Match`: `304`. Delete the file under `BLOB_DIR` and `GET` again:
    `500 blob_lost`, and `bun run blobs:audit` names it as lost.
22. Pull the product group before and after a blob upload: the log is
    unchanged and the bookmark does not move. A blob is not a change (§12.7).

### 16.5 Client conformance vectors

A client can be checked against the rows below without a server, a clock or a
network: each one is an input the contract defines and the outcome it requires.
They are written as vectors, not as tests — a client's suite should encode them,
and a disagreement here is a bug on the client, or a bug in this contract.

Notation: `local` is the client's row/aggregate before the operation, `incoming`
is what arrived (merge points A/B/C), `clock` is the entity's `*_updated_at` (or
the record header's `record_updated_at`), and `dirty` is `*_sync_at`.

#### Merge (§5)

| # | given | expect |
| --- | --- | --- |
| M1 | no local row; incoming is a valid row | insert it, keep every column as received, `dirty = s` on a pull |
| M2 | identical rows, same clock | nothing changes; `dirty = s` on a pull, `noop` on a push |
| M3 | incoming clock `3000`, local clock `2000` | replace the local row; `dirty = s` / `ack.seq` |
| M4 | incoming clock `1000`, local clock `2000` | keep the local row; leave `dirty` exactly as it was |
| M5 | equal clocks, different content | the **stored** side wins (`stale` on a push, keep local on a pull) |
| M6 | `listing_price: 5000` vs `5000.0` | equal values, not different |
| M7 | `method_name: null` vs `""` | different values; the newer clock decides |
| M8 | local live, incoming soft-deleted, incoming clock newer | the tombstone replaces the row; it is a normal row with `deleted_at` set |
| M9 | `money` note changed, newer clock, immutable fields equal | `applied`: note and deleted flag accepted |
| M10 | `money_value` differs from the stored row | `stale` with the stored row; the ledger never re-prices |
| M11 | `timestamp` differs | `stale` |
| M12 | `pocket_id` differs | `stale` |
| M13 | `product_event` id not stored | `applied`, one new log entry |
| M14 | `product_event` id already stored, different payload | `noop`; payload not compared |
| M15 | record aggregate: same children in a different array order | identical aggregate → `noop` |
| M16 | record aggregate: one child omitted, newer clock | `applied`; the child is deleted (children are replaced wholesale) |
| M17 | record aggregate: newer clock, header and children changed | `applied`; all five child sets replaced |
| M18 | record aggregate: equal clock | `stale` with the stored header and children |
| M19 | `discounts` row references a listing absent from the aggregate | stored; never a page failure (§7.3) |

#### Pages, bookmarks and stream edges (§3)

| # | given | expect |
| --- | --- | --- |
| P1 | `meta.snapshot = 41`, `done.s = 39` | bookmark becomes `39`, never `41` |
| P2 | rows received, stream ends before `done` | roll back the page; bookmark unchanged |
| P3 | `done.more = true`, next page is empty | bookmark unchanged; not an error |
| P4 | the same row appears twice in one page (`s = 38`, `s = 44`) | apply in order; the `44` version is the visible one |
| P5 | `del` line for a record id | delete the header **and** its five child sets, then continue |
| P6 | an unknown `t` value on a pull line | ignore that line, keep reading, bookmark still moves |
| P7 | 900 lines applied, then the connection drops | nothing is committed; the bookmark is the old one |
| P8 | `more: true` page, then a page without `done` | the second page is discarded; the bookmark is the first page's `done.s`; re-ask from it |

#### Push selection and acks (§4, §4.12)

| # | given | expect |
| --- | --- | --- |
| A1 | `dirty = NULL` | selected for the next batch |
| A2 | `dirty = 42` | never selected; the push selector ignores it |
| A3 | `applied(seq 50)`, local clock unchanged since send | `dirty = 50`, content untouched |
| A4 | `applied(seq 50)`, local clock changed since send | **skip** the ack; `dirty` stays `NULL`; the next push sends the newer version |
| A5 | `stale(row, seq 60)`, local clock unchanged since send | replace the local row with `row`; `dirty = 60` |
| A6 | `stale(row, seq 60)`, local clock changed since send | **skip** the ack; keep the local edit and its `NULL`; the next push gets a fresh `stale` |
| A7 | record `stale`, a child edited after the frame was sent | skip: the header's `record_updated_at` moved |
| A8 | `applied` for a `product_event` | apply; append-only has no clock and nothing to lose |
| A9 | batch re-sent after a lost response | every frame is `noop` or `stale`; no duplicate log entries |
| A10 | `applied` for a row the client deleted locally meanwhile (soft delete) | skip: the delete bumped the clock; push the tombstone |

#### The clock (§5.1.1)

| # | given | expect |
| --- | --- | --- |
| C1 | stored clock `2000`, wall clock `2000` | write `2001` |
| C2 | stored clock `2000`, wall clock `2500` | write `2500` |
| C3 | stored clock `9_000_000` (a fast device), wall clock `2000` | write `9_000_001` |
| C4 | a pulled row | write nothing; the clock is exactly the value received |
| C5 | two edits in the same millisecond | the second writes one more than the first |

#### Reset, retention and orphans (§6.6, §9.8, §15.1)

| # | given | expect |
| --- | --- | --- |
| R1 | pull `400` | bookmark `0`; every synced row marked dirty; **nothing deleted**; then pull and push |
| R2 | pull `410` with `floor: 40` | bookmark `40` (not `0`); every synced row marked dirty; then pull and push |
| R3 | pull `410` with `floor: 40`, client still asks from `0` | `410` again — a reset must use the floor |
| R4 | retention disabled (`RETENTION_LEASE_DAYS=0`) | `410` never appears; `400` still does |
| R5 | live `money` row whose `pocket` is soft-deleted | kept, hidden from live views, still counted in totals |
| R6 | the pocket is restored (newer `pocket_updated_at`) | the money row is visible again; it was never deleted |
| R7 | deleting a pocket | its money rows are tombstoned with the same clock value and marked dirty |
| R8 | push batch contains a `del` frame | never happens; a deletion is a soft-deleted row |

#### Image bytes (§8.7.1)

| # | given | expect |
| --- | --- | --- |
| B1 | row pushed, then `PUT` the bytes for its `image_updated_at` | `201`, `current: true`; store `image_blob_version`/`sha256`, set `image_blob_sync_at` |
| B2 | the same `PUT` again | `200`, `deduped: true`; nothing else changes |
| B3 | `PUT` a different body for the same `(image_id, version)` | `409`; **adopt** the stored `sha256`, clear `image_blob_version`, fetch it; never overwrite |
| B4 | `PUT` before the row is on the server | `404`; push rows first, then retry once |
| B5 | row came back `stale` from the push | do **not** upload; the local bytes belong to a losing version |
| B6 | pulled row with `image_updated_at` newer than `image_blob_version` | needs fetch: show the old file or a placeholder, never as the current image |
| B7 | manifest has no entry for a row that needs a fetch | placeholder; retry next cycle (the origin device has not uploaded yet) |
| B8 | download whose sha256 does not match the URL | discard the file; keep the previous one; retry |
| B9 | a downloaded blob | set `image_blob_sync_at`; it is never re-uploaded |
| B10 | pull merge over an `image` row | the seven wire columns are replaced, the three blob columns and the dirty flag are untouched |
| B11 | a pull page containing `image` rows | the bookmark moves with the page; bytes are fetched after the commit, never before |
| B12 | image row soft-deleted | drop any queued upload for it; the manifest no longer lists it |

### 16.6 Related documents

| file | what it is |
| --- | --- |
| `docs/SYNC-CONTRACT.md` | a pointer to this document and the per-group records |
| `docs/SYNC-V2-MONEY.md` | money group: rationale and worked examples |
| `docs/SYNC-V2-CUSTOMER.md` | customer group |
| `docs/SYNC-V2-SUPPLIER.md` | supplier group |
| `docs/SYNC-V2-METHOD.md` | method group |
| `docs/SYNC-V2-SOCIAL.md` | social group |
| `docs/SYNC-V2-EXTRA.md` | extra group |
| `docs/SYNC-V2-PRODUCT.md` | product catalog and stock journal |
| `docs/SYNC-V2-RECORD.md` | record aggregate, full refresh, streamed acks |
| `docs/PROPOSAL-DISCUSSION.md` | the review that led to the change-log design |
| `docs/LOGS.md` | the server's request log (a different thing from the sync log) |
| `public/openapi.yaml` | the HTTP surface as OpenAPI (token-gated) |
| `README.md` | the endpoint map, code map and local setup |
