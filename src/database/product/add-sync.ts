import { DuplicateError } from "~/lib/effect-error";
import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";
import { ProductServer } from "~/server/product/get";

export function addSync({
  name,
  barcode,
  price,
  stock,
  capital,
  note,
  id,
  updatedAt,
}: ProductServer) {
  return Effect.gen(function* () {
    if (barcode !== undefined) {
      yield* checkDuplicateBarcode(barcode);
    }
    const now = Date.now();
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO products (product_id, product_name, product_barcode, product_price, product_stock, 
         product_capital, product_note, product_updated_at, product_sync_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, name, barcode ?? null, price, stock, capital, note, updatedAt, now],
      ),
    );
    cache.update(id, {
      id,
      name,
      capital,
      note,
      price,
      stock,
      barcode,
      syncAt: now,
      updatedAt,
    });
  });
}

function checkDuplicateBarcode(barcode: string) {
  return Effect.gen(function* () {
    const products = cache.all();
    if (products !== null) {
      for (const p of products) {
        if (p.barcode === barcode) return yield* Effect.fail(new DuplicateError(p.name));
      }
      return yield* Effect.void;
    }
    const product = yield* DB.try((db) =>
      db.select<{ product_name: string }[]>(
        "SELECT product_name FROM products WHERE product_barcode = $1",
        [barcode],
      ),
    );
    if (product.length > 0) {
      return yield* Effect.fail(new DuplicateError(product[0].product_name));
    }
  });
}
