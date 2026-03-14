import { DB } from "../instance";
import { getCache, setCache } from "./caches";
import { Effect } from "effect";

type Input = {
  id: number;
  name: string;
  price: number;
  stock: number;
  capital: number;
  barcode?: string;
  note: string;
};

export class DuplicateError {
  readonly _tag = "DuplicateError";
  constructor(public name: string) {}
}

export function updateInfo({ id, name, price, stock, capital, barcode, note }: Input) {
  return Effect.gen(function* () {
    if (barcode !== undefined) {
      const product = yield* DB.try((db) =>
        db.select<{ product_name: string; product_id: number }[]>(
          "SELECT product_name, product_id FROM products WHERE product_barcode = $1",
          [barcode],
        ),
      );
      if (product.length > 0 && product[0].product_id !== id) {
        return yield* Effect.fail(new DuplicateError(product[0].product_name));
      }
    }
    yield* DB.try((db) =>
      db.execute(
        `UPDATE products SET product_name = $1, product_price = $2, product_stock = $3, product_capital = $4,
       product_barcode = $5, product_note = $6 WHERE product_id = $7`,
        [name, price, stock, capital, barcode ?? null, note, id],
      ),
    );
    const cache = getCache();
    if (cache !== null) {
      setCache((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            return {
              id,
              capital,
              name,
              price,
              stock,
              barcode,
            };
          }
          return p;
        }),
      );
    }
  });
}
