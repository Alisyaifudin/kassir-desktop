import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function delById(id: string) {
  const graveId = generateId();
  const now = Date.now();
  return Effect.gen(function* () {
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
        bindings.push(eventId, now, null, "dec", product.qty, product.id);
      }
      for (const product of products) {
        query += `UPDATE products SET product_stock = product_stock - $${i++} WHERE product_id = $${i++};\n`;
        bindings.push(product.qty, product.id)
      }
    }
    yield* DB.try((db) => db.execute(query, bindings));
  });

}
