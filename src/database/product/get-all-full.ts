import { DB } from "../instance";
import { Effect } from "effect";

export function allFull() {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) => db.select<DB.Product[]>("SELECT * FROM products"));
    const items = res.map((r) => ({
      barcode: r.product_barcode ?? undefined,
      name: r.product_name,
      price: r.product_price,
      id: r.product_id,
      stock: r.product_stock,
      capital: r.product_capital,
      note: r.product_note,
    }));
    return items;
  });
}
