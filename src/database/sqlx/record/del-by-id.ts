import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { createBindings } from "~/lib/bind";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw row shape from the linked-events join query. */
type EventRow = {
  product_event_id: string;
  capital_id: string;
  // product_event_type: DB.ProductEventEnum;
  product_event_value: number;
  capital_stock: number;
  product_id: string;
};

/** Cleaned-up event object used throughout the function. */
type LinkedEvent = {
  id: string;
  capitalId: string;
  // type: DB.ProductEventEnum;
  value: number;
  stock: number;
  productId: string;
};

/** A reversed (undo) event with all the fields needed to build undo queries. */
type UndoEvent = {
  undoId: string;
  capitalId: string;
  productId: string;
  // undoType: DB.ProductEventEnum;
  undoValue: number;
  undoStock: number;
  note: string;
  timestamp: number;
};

// ---------------------------------------------------------------------------
// Step 1 – Fetch every product-event that belongs to the record
// ---------------------------------------------------------------------------

function fetchLinkedEvents(recordId: string) {
  return DB.select<EventRow[]>(
    `SELECT
       record_products.product_event_id,
       product_events.capital_id,
       capital_stock,
       product_id,
       product_event_type,
       product_event_value
     FROM record_products
     INNER JOIN product_events
       ON product_events.product_event_id = record_products.product_event_id
     INNER JOIN capitals
       ON capitals.capital_id = product_events.capital_id
     WHERE record_products.record_id = $1`,
    [recordId],
  ).pipe(
    Effect.map((rows) =>
      rows.map((r) => ({
        id: r.product_event_id,
        capitalId: r.capital_id,
        // type: r.product_event_type,
        value: r.product_event_value,
        stock: r.capital_stock,
        productId: r.product_id,
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// Step 2 – Build inverse (undo) events for every linked event
// ---------------------------------------------------------------------------

function buildUndoEvents(events: LinkedEvent[], now: number): UndoEvent[] {
  return events.map((event) => {
    return {
      undoId: generateId(),
      capitalId: event.capitalId,
      productId: event.productId,
      undoValue: event.value,
      undoStock: event.stock - event.value,
      note: `undo:${event.id}`,
      timestamp: now,
    };
  });
}

// ---------------------------------------------------------------------------
// Step 3a – Count how many product_events exist *per capital*
// ---------------------------------------------------------------------------

function fetchEventCountsByCapital(events: LinkedEvent[]) {
  const capitalIds = [...new Set(events.map((e) => e.capitalId))];
  if (capitalIds.length === 0) {
    return Effect.succeed(new Map<string, number>());
  }
  const { bind, bindings } = createBindings();
  const placeholders = capitalIds.map((id) => bind(id)).join(", ");
  return DB.select<{ count: number; capital_id: string }[]>(
    `SELECT COUNT(*) AS count, capital_id
     FROM product_events
     WHERE capital_id IN (${placeholders})
     GROUP BY capital_id`,
    bindings,
  ).pipe(Effect.map((rows) => new Map(rows.map((r) => [r.capital_id, r.count]))));
}

// ---------------------------------------------------------------------------
// Step 3b – Count how many capitals exist *per product*
// ---------------------------------------------------------------------------

function fetchCapitalCountsByProduct(events: LinkedEvent[]) {
  const productIds = [...new Set(events.map((e) => e.productId))];
  if (productIds.length === 0) {
    return Effect.succeed(new Map<string, number>());
  }
  const { bind, bindings } = createBindings();
  const placeholders = productIds.map((id) => bind(id)).join(", ");
  return DB.select<{ count: number; product_id: string }[]>(
    `SELECT COUNT(*) AS count, product_id
     FROM capitals
     WHERE product_id IN (${placeholders})
     GROUP BY product_id`,
    bindings,
  ).pipe(Effect.map((rows) => new Map(rows.map((r) => [r.product_id, r.count]))));
}

// ---------------------------------------------------------------------------
// Step 4 – Build the full SQL transaction + bindings
// ---------------------------------------------------------------------------

function buildDeleteTransaction(
  undoEvents: UndoEvent[],
  eventCounts: Map<string, number>,
  capitalCounts: Map<string, number>,
  recordId: string,
  now: number,
): { sql: string; bindings: unknown[] } {
  const { bind, bindings } = createBindings();
  const queries: string[] = [];

  for (const event of undoEvents) {
    const eventCount = eventCounts.get(event.capitalId);
    const capitalCount = capitalCounts.get(event.productId);
    const isOnlyEvent = eventCount === 1;
    const hasOtherCapitals = capitalCount !== undefined && capitalCount > 1;

    if (isOnlyEvent && hasOtherCapitals) {
      // --- Branch A: soft-delete the capital (it has no other events) ---
      queries.push(
        `UPDATE capitals SET
           capital_deleted_at = ${bind(now)},
           capital_updated_at = ${bind(now)},
           capital_sync_at = null
         WHERE capital_id = ${bind(event.capitalId)}`,
        // Clean up orphaned product_events for this capital
        `DELETE FROM product_events WHERE capital_id = ${bind(event.capitalId)}`,
      );
    } else {
      // --- Branch B: insert the undo event + update stock ---
      queries.push(
        `INSERT INTO product_events
           (product_event_id, timestamp, product_event_sync_at,
            product_event_value, product_event_note, capital_id)
         VALUES (${bind(event.undoId)}, ${bind(event.timestamp)}, ${bind(null)},
           ${bind(event.undoValue)}, ${bind(event.note)}, ${bind(event.capitalId)})`,
        // update stock
        `UPDATE capitals SET capital_stock = ${bind(event.undoStock)},
           capital_updated_at = ${bind(now)},
           capital_sync_at = null
         WHERE capital_id = ${bind(event.capitalId)}`,
      );
    }
  }

  // --- Record cleanup (always runs) ---
  const queriesStr = queries.join("\n");
  const sql = `BEGIN TRANSACTION;
${queriesStr}
UPDATE records SET
  record_deleted_at = ${bind(now)},
  record_updated_at = ${bind(now)},
  record_sync_at = null
WHERE record_id = ${bind(recordId)};
DELETE FROM record_extras WHERE record_id = ${bind(recordId)};
DELETE FROM record_products WHERE record_id = ${bind(recordId)};
COMMIT;`;

  return { sql, bindings };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function deleteRecordById(recordId: string) {
  const now = Date.now();
  return Effect.gen(function* () {
    const events = yield* fetchLinkedEvents(recordId);
    const undoEvents = buildUndoEvents(events, now);

    const [eventCounts, capitalCounts] = yield* Effect.all(
      [fetchEventCountsByCapital(events), fetchCapitalCountsByProduct(events)],
      { concurrency: "unbounded" },
    );

    const { sql, bindings } = buildDeleteTransaction(
      undoEvents,
      eventCounts,
      capitalCounts,
      recordId,
      now,
    );

    yield* DB.execute(sql, bindings).pipe(Effect.asVoid);
  });
}
