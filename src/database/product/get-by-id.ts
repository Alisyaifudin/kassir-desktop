import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";

export type Product = {
  id: number;
  barcode?: string;
  name: string;
  price: number;
  stock: number;
  capital: number;
  note: string;
};

export function getById(id: number) {
  return DB.try((db) =>
    db.select<DB.Product[]>("SELECT * FROM products WHERE product_id = $1", [id]),
  ).pipe(
    Effect.flatMap((r) =>
      r.length === 0 ? NotFound.fail("Barang tidak ditemukan") : Effect.succeed(r[0]),
    ),
    Effect.map(
      (r) =>
        ({
          id: r.product_id,
          barcode: r.product_barcode ?? undefined,
          name: r.product_name,
          price: r.product_price,
          stock: r.product_stock,
          capital: r.product_capital,
          note: r.product_note,
        }) satisfies Product,
    ),
  );
}
