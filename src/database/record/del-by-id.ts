import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";
import { productCache } from "../product/cache";

export function delById(id: string) {
  const graveId = generateId();
  const now = Date.now();
  return Effect.gen(function* () {
    const [products, records] = yield* Effect.all([
      DB.try((db) =>
        db.select<{ id: string; qty: number }[]>(
          `SELECT record_products.product_id AS id, record_product_qty AS qty FROM record_products 
          INNER JOIN records ON records.record_id = record_products.record_id
          WHERE records.record_id = $1 AND record_products.product_id IS NOT NULL`,
          [id],
        ),
      ),
      DB.try((db) =>
        db.select<{ record_mode: DB.Mode }[]>(
          `SELECT record_mode FROM records WHERE record_id = $1`,
          [id],
        ),
      ),
    ]);
    if (records.length === 0) return Effect.void;
    const mode = records[0].record_mode;
    const bindings: (null | string | number)[] = [];
    let i = 1;
    let query = `DELETE FROM records WHERE record_id = $${i++};\n
       INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp) 
       VALUES (${i++}, $${i++}, $${i++}, $${i++});\n`;
    bindings.push(id, id, graveId, "record", now);

    const productEventPlaceholders = products
      .map(() => `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`)
      .join(", ");
    if (productEventPlaceholders.length > 0) {
      query += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
                VALUES ${productEventPlaceholders};\n`;
      for (const product of products) {
        const eventId = generateId();
        bindings.push(eventId, now, null, mode === "sell" ? "inc" : "dec", product.qty, product.id);
      }
      const sign = mode === "sell" ? "+" : "-";
      for (const product of products) {
        query += `UPDATE products SET product_stock = product_stock ${sign} $${i++} WHERE product_id = $${i++};\n`;
        bindings.push(product.qty, product.id);
      }
    }
    const wrappedQuery = `BEGIN;\n${query}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedQuery, bindings));
    for (const product of products) {
      productCache.update(product.id, (prev) => ({
        ...prev,
        stock: mode === "sell" ? prev.stock + product.qty : prev.stock - product.qty,
      }));
    }
  });
}
