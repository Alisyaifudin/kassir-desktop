import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function delSync(id: string) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<{ record_id: string }[]>("SELECT record_id FROM records WHERE record_id = $1", [
        id,
      ]),
    );
    if (res.length === 0) {
      yield* DB.try((db) => db.execute(`DELETE FROM graves WHERE grave_item_id = $1`, [id]));
      return;
    }

    const products = yield* DB.try((db) =>
      db.select<{ id: string; qty: number }[]>(
        `SELECT record_products.product_id AS id, record_product_qty AS qty FROM record_products 
         INNER JOIN records ON records.record_id = record_products.record_id
         WHERE records.record_id = $1 AND record_products.product_id IS NOT NULL`,
      ),
    );

    const bindings: (null | string | number)[] = [];
    let i = 1;
    let query = `DELETE FROM records WHERE record_id = $${i++};\n
                 DELETE FROM graves WHERE grave_item_id = $${i++};\n`;
    bindings.push(id, id);
    const now = Date.now();
    const productEventPlaceholders = products
      .map(() => `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`)
      .join(", ");
    if (productEventPlaceholders.length > 0) {
      query += `INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
                VALUES ${productEventPlaceholders};\n`;
      for (const product of products) {
        const eventId = generateId();
        bindings.push(eventId, now, null, "dec", product.qty, product.id);
      }
      for (const product of products) {
        query += `UPDATE products SET product_stock = product_stock - $${i++} WHERE product_id = $${i++};\n`;
        bindings.push(product.qty, product.id);
      }
    }
    const wrappedQuery = `BEGIN;\n${query}COMMIT;`;
    yield* DB.try((db) => db.execute(wrappedQuery, bindings));
  });
}
