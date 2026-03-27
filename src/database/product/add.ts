import { DuplicateError } from "~/lib/effect-error";
import { DB } from "../instance";
import { cache } from "./cache";
import { Effect } from "effect";
import { generateId } from "~/lib/random";

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
      yield* checkDuplicateBarcode(barcode);
    }
    const id = generateId();
    const eventId = generateId();
    const now = Date.now();
    yield* DB.try((db) =>
      db.execute(
        `BEGIN;
         INSERT INTO products (product_id, product_name, product_barcode, product_price, product_stock, 
         product_capital, product_note, product_updated_at, product_sync_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
         INSERT INTO product_events (id, created_at, sync_at, type, value, product_id) 
         VALUES ($10, $11, $12, $13, $14, $15);
         COMMIT;`,
        [
          id,
          name,
          barcode ?? null,
          price,
          stock,
          capital,
          note,
          now,
          null,
          eventId,
          now,
          null,
          "manual",
          stock,
          id,
        ],
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
      syncAt: null,
      updatedAt: now,
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
