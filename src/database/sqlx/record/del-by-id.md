# `deleteRecordById` — State Machine Documentation

## Overview

`deleteRecordById(id)` reverses all stock mutations that were created when a transaction record was made. It undoes every product event linked to the record, then soft-deletes the record itself.

---

## Machine 1 — Function Control Flow

```
                    ┌──────────────────┐
                    │      IDLE        │
                    └────────┬─────────┘
                             │ deleteRecordById(id)
                             ▼
                    ┌──────────────────┐
                    │    FETCHING      │──→ fetchLinkedEvents(id)
                    │  (JOIN 3 tables) │
                    └────────┬─────────┘
                             │ events[]
                    ┌────────┴─────────┐
                    │  events empty?   │
                    └───┬─────────┬────┘
                      YES         NO
                       │           │
                       │           ▼
                       │  ┌──────────────────┐
                       │  │  BUILDING UNDO   │──→ buildUndoEvents()
                       │  │  (pure, flip     │
                       │  │   inc↔dec)       │
                       │  └────────┬─────────┘
                       │           │ undoEvents[]
                       │           ▼
                       │  ┌──────────────────┐
                       │  │    COUNTING      │──→ fetchEventCountsByCapital()
                       │  │  (parallel)      │──→ fetchCapitalCountsByProduct()
                       │  └────────┬─────────┘
                       │           │ eventCounts, capitalCounts
                       │           ▼
                       │  ┌──────────────────┐
                       │  │    DECIDING      │──→ buildDeleteTransaction()
                       │  │  (for each undo  │
                       │  │   event)         │
                       │  └────────┬─────────┘
                       │           │ { sql, bindings }
                       │           │
                       └─────┬─────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   EXECUTING      │──→ DB.execute(txn)
                    │  (BEGIN..COMMIT) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │      DONE        │
                    └──────────────────┘
```

---

## Machine 2 — Per-Event Decision

Each undo event enters the decision machine independently:

```
                    ┌──────────────────────┐
                    │   EVALUATE EVENT     │
                    │  eventCount  = Map.get(capitalId)  │
                    │  capitalCount = Map.get(productId) │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
        count === 1      count > 1     count === undefined
        (sole event)    (has others)   (never happens,
                 │             │         but safe default)
                 │             │             │
                 └──────┬──────┘─────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   capitalCount   │
              └───┬─────────┬────┘
                  │         │
               > 1       ≤ 1  or  undefined
           (has others)  (sole capital  or  unknown)
                  │         │
                  ▼         ▼
         ┌────────────┐  ┌────────────┐
         │  BRANCH A  │  │  BRANCH B  │
         │  delete    │  │  insert    │
         │  capital   │  │  undo      │
         └─────┬──────┘  └─────┬──────┘
               │               │
               ▼               ▼
         ┌────────────┐  ┌────────────┐
         │  NEXT      │  │  NEXT      │
         │  EVENT     │  │  EVENT     │
         │  (or DONE) │  │  (or DONE) │
         └────────────┘  └────────────┘
```

---

## Machine 3 — Capital Lifecycle

```
                        ┌──────────────┐
                        │    ACTIVE    │
                        │  deleted_at  │
                        │    = null    │
                        └──┬───────┬───┘
                           │       │
                     Branch A   Branch B
                           │       │
                           ▼       ▼
                  ┌────────────┐  ┌──────────────────┐
                  │SOFT_DELETED│  │     ACTIVE       │
                  │ deleted_at │  │  (stock updated) │
                  │   = now    │  │  + new undo      │
                  │ sync_at    │  │    event added   │
                  │   = null   │  │                  │
                  │ events     │  │  stock = undoStock│
                  │ deleted    │  │  events += 1     │
                  └────────────┘  └──────────────────┘
```

---

## Branch Actions

### Branch A — Delete Capital

**Conditions:** `eventCount === 1` AND `capitalCount > 1`

> The capital has only one event (the one being undone) and the product has other capitals. The capital was auto-created for this transaction — safe to remove.

```
UPDATE capitals SET
  capital_deleted_at = now,
  capital_updated_at = now,
  capital_sync_at    = null
WHERE capital_id = $id

DELETE FROM product_events WHERE capital_id = $id
```

### Branch B — Insert Undo Event

**Conditions:** everything else

> Either the capital has other events (keep it) or it's the product's only capital (must not orphan the product). Reverse the stock change and insert a new inverse event.

```
INSERT INTO product_events
  (product_event_id, timestamp, product_event_sync_at,
   product_event_type, product_event_value,
   product_event_note, capital_id)
VALUES ($undoId, $timestamp, null, $undoType, $undoValue, $note, $capitalId)

UPDATE capitals SET
  capital_stock     = $undoStock,
  capital_updated_at = now,
  capital_sync_at   = null
WHERE capital_id = $id
```

---

## Decision Matrix

| `eventCount` | `capitalCount` | Branch | SQL Operations | Meaning |
|---|---|---|---|---|
| `undefined` | any | B | INSERT undo event + UPDATE stock | Safe fallback — data missing |
| any | `undefined` | B | INSERT undo event + UPDATE stock | Safe fallback — data missing |
| `0` | any | B | INSERT undo event + UPDATE stock | Shouldn't occur (event exists) |
| `1` | `0` | B | INSERT undo event + UPDATE stock | Shouldn't occur |
| `1` | `1` | B | INSERT undo event + UPDATE stock | Can't delete product's only capital |
| **`1`** | **`>1`** | **A** | Soft-delete capital + DELETE events | Capital orphaned — safe to remove |
| `>1` | `1` | B | INSERT undo event + UPDATE stock | Capital has history; product needs it |
| `>1` | `>1` | B | INSERT undo event + UPDATE stock | Capital has history |

---

## Edge Cases Covered

| Scenario | Behaviour |
|---|---|
| Record with **no products** (`events = []`) | Loop skipped; only record cleanup runs |
| Multiple undo events for the **same capital** | All hit Branch B; stock walks backward incrementally per UPDATE |
| Multiple undo events on **different capitals** | Each capital decided independently |
| `capitalCount` or `eventCount` is `undefined` | Falls to Branch B (never delete on missing data) |
| Transaction fails mid-way | SQLite `BEGIN..COMMIT` rolls everything back atomically |
