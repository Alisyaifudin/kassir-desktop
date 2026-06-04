import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { NotFound } from "~/lib/effect-error";

export function calcStock(id: string) {
  return Effect.gen(function* () {
    const initStock = yield* getStock(id);
    const lastManual = yield* getLastManual(id, initStock);
    const events = yield* DB.try((db) =>
      db.select<{ type: "inc" | "dec"; value: number }[]>(
        `SELECT type, value FROM product_events WHERE product_id = $1 AND created_at > $2`,
        [id, lastManual.timestamp],
      ),
    );
    let stock = lastManual.stock;
    for (const event of events) {
      switch (event.type) {
        case "dec":
          stock -= event.value;
          break;
        case "inc":
          stock += event.value;
          break;
      }
    }
    yield* DB.try((db) =>
      db.execute(`UPDATE products SET product_stock = $1 WHERE product_id = $2`, [stock, id]),
    );
    if (lastManual.isSync) {
      // already sync, delete all previous events to save space
      yield* DB.try((db) =>
        db.execute(`DELETE FROM product_events WHERE product_id = $1 AND created_at < $2`, [
          id,
          lastManual.timestamp,
        ]),
      );
    }
  });
}

function getStock(id: string) {
  return DB.try((db) =>
    db.select<{ product_stock: number }[]>(
      "SELECT product_stock FROM products WHERE product_id = $1",
      [id],
    ),
  ).pipe(
    Effect.flatMap((r) => {
      if (r.length === 0) return NotFound.fail("Produk tidak ditemukan");
      return Effect.succeed(r[0].product_stock);
    }),
  );
}

function getLastManual(id: string, initStock: number) {
  return Effect.gen(function* () {
    const startingEvents = yield* DB.try((db) =>
      db.select<{ created_at: number; value: number; sync_at: number | null }[]>(
        `SELECT created_at, value, sync_at FROM product_events WHERE type = 'manual' AND product_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [id],
      ),
    );
    if (startingEvents.length === 0) {
      // no manual event, create it first
      const oldestEvents = yield* DB.try((db) =>
        db.select<{ created_at: number }[]>(
          `SELECT created_at FROM product_events WHERE product_id = $1 ORDER BY created_at LIMIT 1`,
          [id],
        ),
      );
      // no event at all
      if (oldestEvents.length === 0) {
        const eventId = generateId();
        const now = Date.now();
        yield* DB.try((db) =>
          db.execute(
            `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [eventId, now, null, "manual", initStock, id],
          ),
        );
        return { timestamp: now, stock: initStock, isSync: false };
      } else {
        // insert first manual event with 0 initial stock
        const eventId = generateId();
        const oldestEvent = oldestEvents[0].created_at;
        const eventTime = oldestEvent - 1; // the first manual event is older
        yield* DB.try((db) =>
          db.execute(
            `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [eventId, eventTime, null, "manual", 0, id],
          ),
        );
        return { timestamp: eventTime, stock: 0, isSync: false };
      }
    }
    // returned the latest manual event
    const startingEvent = startingEvents[0];
    return {
      timestamp: startingEvent.created_at,
      stock: startingEvent.value,
      isSync: startingEvent.sync_at !== null,
    };
  });
}
