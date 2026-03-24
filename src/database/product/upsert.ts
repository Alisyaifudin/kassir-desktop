import { DuplicateError } from "~/lib/effect-error";
import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";

type Input = {
  id: string;
  name: string;
  price: number;
  stock: number;
  capital: number;
  barcode?: string;
  note: string;
  updatedAt: number;
};

export function upsert({ id, name, price, stock, capital, barcode, note, updatedAt }: Input) {
  return Effect.gen(function* () {
    if (barcode !== undefined) {
      yield* checkDuplicate(barcode, id);
    }
    const now = Date.now();
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO products (product_id, product_name, product_barcode, product_price, product_stock, 
         product_capital, product_note, product_updated_at, product_sync_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET
         product_name = excluded.product_name,
         product_barcode = excluded.product_barcode,
         product_price = excluded.product_price,
         product_stock = excluded.product_stock,
         prodcut_capital = excluded.produce_capital,
         product_note = excluded.product_note,
         product_updated_at = excluded.product_updated_at,
         product_sync_at = excluded.product_sync_at`,
        [id, name, barcode ?? null, price, stock, capital, note, updatedAt, now],
      ),
    );
    cache.update(id, {
      id,
      name,
      price,
      stock,
      capital,
      note,
      barcode,
      syncAt: now,
      updatedAt,
    });
  });
}

function checkDuplicate(barcode: string, productId: string) {
  return Effect.gen(function* () {
    const products = cache.all();
    if (products !== null) {
      for (const p of products.values()) {
        if (p.barcode === barcode && p.id !== productId)
          return yield* Effect.fail(new DuplicateError(p.name));
      }
      return yield* Effect.void;
    }
    const product = yield* DB.try((db) =>
      db.select<{ product_name: string }[]>(
        "SELECT product_name FROM products WHERE product_barcode = $1 AND product_id != $2",
        [barcode, productId],
      ),
    );
    if (product.length > 0) {
      return yield* Effect.fail(new DuplicateError(product[0].product_name));
    }
  });
}
