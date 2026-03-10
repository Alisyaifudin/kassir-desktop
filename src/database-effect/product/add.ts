import { DB } from "../instance";
import { getCache, setCache } from "./caches";
import { Effect } from "effect";
import { DuplicateError } from "./update-info";

type Input = {
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  capital: number;
  note: string;
};

export function add({ name, barcode, price, stock, capital, note }: Input) {
  return Effect.gen(function* () {
    if (barcode !== undefined) {
      const product = yield* DB.try((db) =>
        db.select<{ product_name: string }[]>(
          "SELECT product_name FROM products WHERE product_barcode = $1",
          [barcode],
        ),
      );
      if (product.length > 0) {
        return yield* Effect.fail(new DuplicateError(product[0].product_name));
      }
    }
    const res = yield* DB.try((db) =>
      db.execute(
        `INSERT INTO products (product_name, product_barcode, product_price, product_stock, product_capital, product_note) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, barcode ?? null, price, stock, capital, note],
      ),
    );
    const id = res.lastInsertId;
    if (id === undefined) {
      setCache(null);
    } else {
      const cache = getCache();
      if (cache !== null) {
        setCache((prev) => [
          ...prev,
          { id, name, barcode: barcode ?? undefined, capital, price, stock },
        ]);
      }
    }
  });
}
