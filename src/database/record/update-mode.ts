import { Effect } from "effect";
import { DB } from "../instance";
import { NotFound } from "~/lib/effect-error";
import { generateId } from "~/lib/random";

export function updateMode(recordId: string, mode: DB.Mode) {
  return Effect.gen(function* () {
    const recordProducts = yield* DB.try((db) =>
      db.select<{ id: number; qty: number; capital: number }[]>(
        `SELECT product_id AS id, record_product_qty AS qty, record_product_capital_raw AS capital 
         FROM record_products WHERE record_id = $1 AND product_id IS NOT NULL`,
        [recordId],
      ),
    );

    const productData = yield* Effect.all(
      recordProducts.map(({ id, qty, capital }) =>
        Effect.gen(function* () {
          const [prevCapital, prevPrice, stock] = yield* Effect.all(
            [
              DB.try((db) =>
                db.select<{ record_product_capital: number }[]>(
                  `SELECT record_product_capital 
                   FROM record_products
                   INNER JOIN records ON records.record_id = record_products.record_id
                   WHERE record_mode = 'buy' AND product_id = $1 AND records.record_paid_at < $2
                   ORDER BY records.record_paid_at DESC
                   LIMIT 1`,
                  [id, recordId],
                ),
              ).pipe(
                Effect.map((r) => {
                  if (r.length === 0) return 0;
                  return r[0].record_product_capital;
                }),
              ),
              DB.try((db) =>
                db.select<{ record_product_price: number }[]>(
                  `SELECT record_product_price 
                   FROM record_products
                   INNER JOIN records ON records.record_id = record_products.record_id
                   WHERE record_mode = 'sell' AND product_id = $1 AND records.record_paid_at < $2
                   ORDER BY records.record_paid_at DESC
                   LIMIT 1`,
                  [id, recordId],
                ),
              ).pipe(
                Effect.map((r) => {
                  if (r.length === 0) return 0;
                  return r[0].record_product_price;
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

          return { id, qty, capital, prevCapital, prevPrice, stock };
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
    binds.push(mode, now, null, recordId);
    for (const p of productData) {
      if (mode === "buy") {
        const originalStock = p.stock + p.qty;
        const finalStock = originalStock + p.qty;

        const updatedCapital = calcCombinedCapital(p.prevCapital, originalStock, p.capital, p.qty);

        sql += `UPDATE products SET product_stock = $${bindIndex++}, product_capital = $${bindIndex++}, 
        product_price = $${bindIndex++}, product_updated_at = $${bindIndex++}, 
        product_sync_at = $${bindIndex++} WHERE product_id = $${bindIndex++};\n`;
        binds.push(finalStock, updatedCapital, p.prevPrice, now, null, p.id);
        const eventId = generateId();
        sql += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id)
                VALUES ($${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, 
                $${bindIndex++});\n`;
        binds.push(eventId, now, null, "inc", 2 * p.qty, p.id);
      } else if (mode === "sell") {
        const updatedStock = p.stock - 2 * p.qty;

        sql += `UPDATE products SET product_stock = $${bindIndex++}, product_capital = $${bindIndex++},
        product_updated_at = $${bindIndex++}, product_sync_at = $${bindIndex++} 
        WHERE product_id = $${bindIndex++};\n`;
        binds.push(updatedStock, p.prevCapital, now, null, p.id);
        const eventId = generateId();
        sql += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id)
                VALUES ($${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, $${bindIndex++}, 
                $${bindIndex++});\n`;
        binds.push(eventId, now, null, "dec", 2 * p.qty, p.id);
      }
    }

    const wrappedSql = `BEGIN;\n${sql}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedSql, binds)).pipe(
      Effect.catchAll((e) => {
        return Effect.fail(e);
      }),
    );
  });
}

export function calcCombinedCapital(
  prevCapital: number,
  prevStock: number,
  buyCapital: number,
  qty: number,
) {
  if (prevStock < 0) {
    return buyCapital;
  }
  const weight = prevStock + qty;
  return weight === 0 ? prevCapital : (prevCapital * prevStock + buyCapital * qty) / weight;
}
