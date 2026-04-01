import { Effect } from "effect";
import { DB } from "../instance";
import { NotFound } from "~/lib/effect-error";
import { generateId } from "~/lib/random";
import { cache } from "../product/cache";

function toSell(recordId: string) {
  return Effect.gen(function* () {
    const recordProducts = yield* DB.try((db) =>
      db.select<{ id: string; qty: number }[]>(
        `SELECT product_id AS id, record_product_qty AS qty 
         FROM record_products WHERE record_id = $1 AND product_id IS NOT NULL`,
        [recordId],
      ),
    );

    const productData = yield* Effect.all(
      recordProducts.map(({ id, qty }) =>
        Effect.gen(function* () {
          const [prevBuyRecord, stock] = yield* Effect.all(
            [
              DB.try((db) =>
                db.select<{ record_product_capital: number; record_product_price: number }[]>(
                  `SELECT record_product_capital, record_product_price 
                   FROM record_products
                   INNER JOIN records ON records.record_id = record_products.record_id
                   WHERE record_mode = 'buy' AND product_id = $1 AND records.record_paid_at < $2
                   ORDER BY records.record_paid_at DESC
                   LIMIT 2`,
                  [id, recordId],
                ),
              ).pipe(
                Effect.map((r) => {
                  const capital = r.length !== 2 ? 0 : r[1].record_product_capital;
                  const price = r.length === 0 ? 0 : r[0].record_product_price;
                  return { capital, price };
                }),
              ),
              DB.try((db) =>
                db.select<{ stock: number }[]>(
                  `SELECT product_stock AS stock FROM products WHERE product_id = $1`,
                  [id],
                ),
              ).pipe(
                Effect.flatMap((r) => {
                  if (r.length === 0) return NotFound.fail("Produk tidak ditemukan");
                  return Effect.succeed(r[0].stock);
                }),
              ),
            ],
            { concurrency: "unbounded" },
          );

          return { id, qty, prevBuyRecord, stock };
        }),
      ),
      { concurrency: 5 },
    );

    const now = Date.now();
    let sql = "";
    const binds: (string | number | null)[] = [];
    let bindIndex = 1;

    sql += `UPDATE records SET record_mode = $${bindIndex++}, record_updated_at = $${bindIndex++},
    record_sync_at = $${bindIndex++} WHERE record_id = $${bindIndex++};\n`;
    binds.push("sell", now, null, recordId);
    for (const p of productData) {
      const updatedStock = p.stock - 2 * p.qty;
      sql += `
      UPDATE products SET product_stock = $${bindIndex++}, product_capital = $${bindIndex++},
      product_price = $${bindIndex++}, product_updated_at = $${bindIndex++}, 
      product_sync_at = $${bindIndex++} WHERE product_id = $${bindIndex++};\n`;
      binds.push(updatedStock, p.prevBuyRecord.capital, p.prevBuyRecord.price, now, null, p.id);
      const eventId = generateId();
      sql += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id)
                VALUES ($${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, 
                $${bindIndex++});\n`;
      binds.push(eventId, now, null, "dec", 2 * p.qty, p.id);
      cache.update(p.id, (prev) => ({
        ...prev,
        stock: updatedStock,
        capital: p.prevBuyRecord.capital,
        price: p.prevBuyRecord.price,
        syncAt: null,
        updatedAt: now,
      }));
    }

    const wrappedSql = `BEGIN;\n${sql}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedSql, binds)).pipe(
      Effect.catchAll((e) => {
        return Effect.fail(e);
      }),
    );
  });
}

function toBuy(recordId: string) {
  return Effect.gen(function* () {
    const recordProducts = yield* DB.try((db) =>
      db.select<{ id: string; qty: number; capital: number }[]>(
        `SELECT product_id AS id, record_product_qty AS qty, record_product_capital_raw AS capital 
         FROM record_products WHERE record_id = $1 AND product_id IS NOT NULL`,
        [recordId],
      ),
    );

    const productData = yield* Effect.all(
      recordProducts.map(({ id, qty, capital }) =>
        Effect.gen(function* () {
          const [prevSellRecord, stock] = yield* Effect.all(
            [
              DB.try((db) =>
                db.select<{ record_product_price: number; record_product_capital: number }[]>(
                  `SELECT record_product_price, record_product_capital 
                   FROM record_products
                   INNER JOIN records ON records.record_id = record_products.record_id
                   WHERE record_mode = 'sell' AND product_id = $1 AND records.record_paid_at < $2
                   ORDER BY records.record_paid_at DESC
                   LIMIT 2`,
                  [id, recordId],
                ),
              ).pipe(
                Effect.map((r) => {
                  const price = r.length !== 2 ? 0 : r[1].record_product_price;
                  const capital = r.length === 0 ? 0 : r[0].record_product_capital;
                  return { capital, price };
                }),
              ),
              DB.try((db) =>
                db.select<{ stock: number }[]>(
                  `SELECT product_stock AS stock FROM products WHERE product_id = $1`,
                  [id],
                ),
              ).pipe(
                Effect.flatMap((r) => {
                  if (r.length === 0) return NotFound.fail("Produk tidak ditemukan");
                  return Effect.succeed(r[0].stock);
                }),
              ),
            ],
            { concurrency: "unbounded" },
          );

          return { id, qty, capital, prevSellRecord, stock };
        }),
      ),
      { concurrency: 5 },
    );

    const now = Date.now();
    let sql = "";
    const binds: (string | number | null)[] = [];
    let bindIndex = 1;

    sql += `UPDATE records SET record_mode = $${bindIndex++}, record_updated_at = $${bindIndex++},
    record_sync_at = $${bindIndex++} WHERE record_id = $${bindIndex++};\n`;
    binds.push("buy", now, null, recordId);
    for (const p of productData) {
      const finalStock = p.stock + 2 * p.qty;
      sql += `
        UPDATE products SET product_stock = $${bindIndex++}, product_capital = $${bindIndex++}, 
        product_price = $${bindIndex++}, product_updated_at = $${bindIndex++}, 
        product_sync_at = $${bindIndex++} WHERE product_id = $${bindIndex++};\n`;
      binds.push(finalStock, p.prevSellRecord.capital, p.prevSellRecord.price, now, null, p.id);
      const eventId = generateId();
      sql += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id)
                VALUES ($${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, 
                $${bindIndex++});\n`;
      binds.push(eventId, now, null, "inc", finalStock, p.id);
      cache.update(p.id, (prev) => ({
        ...prev,
        stock: finalStock,
        capital: p.prevSellRecord.capital,
        price: p.prevSellRecord.price,
        syncAt: null,
        updatedAt: now,
      }));
    }

    const wrappedSql = `BEGIN;\n${sql}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedSql, binds)).pipe(
      Effect.catchAll((e) => {
        return Effect.fail(e);
      }),
    );
  });
}

export function updateMode(recordId: string, mode: DB.Mode) {
  switch (mode) {
    case "buy":
      return toBuy(recordId);
    case "sell":
      return toSell(recordId);
  }
}
