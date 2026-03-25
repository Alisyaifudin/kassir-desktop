import { DuplicateError } from "~/lib/effect-error";
import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";

type Input = {
  id: string;
  name: string;
  price: number;
  capital: number;
  barcode?: string;
  note: string;
};

export function updateInfo({ id, name, price, capital, barcode, note }: Input) {
  return Effect.gen(function* () {
    if (barcode !== undefined) {
      yield* checkDuplicate(barcode, id);
    }
    const now = Date.now();
    yield* DB.try((db) =>
      db.execute(
        `UPDATE products SET product_name = $1, product_price = $2, product_capital = $3,
         product_barcode = $4, product_note = $5, product_updated_at = $6, product_sync_at = null
         WHERE product_id = $7`,
        [name, price, capital, barcode ?? null, note, now, id],
      ),
    );
    cache.update(id, (prev) => ({
      ...prev,
      id,
      name,
      price,
      capital,
      note,
      barcode,
      syncAt: null,
      updatedAt: now,
    }));
  });
}

function checkDuplicate(barcode: string, productId: string) {
  return Effect.gen(function* () {
    const productCache = cache.get(productId);
    if (productCache !== undefined) {
      if (productCache.barcode === barcode && productCache.id !== productId)
        return yield* Effect.fail(new DuplicateError(productCache.name));

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
