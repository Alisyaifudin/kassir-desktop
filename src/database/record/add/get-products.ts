import { Effect } from "effect";
import { DB } from "~/database/instance";
import { ManyDuplicateError } from "~/lib/effect-error";
import { RecordType } from "./type";

export type ProductInStock = {
  name: string;
  stock: number;
  capital: number;
  price: number;
  barcode: string | null;
  id: string;
};

export function getProducts(products: RecordType.Product[]) {
  const ids = products
    .map((p) =>
      p.product?.id !== undefined
        ? p.product.id
        : p.product === undefined && p.barcode.trim() !== ""
          ? p.id
          : null,
    )
    .filter((id): id is string => id !== null);

  if (ids.length === 0) return Effect.succeed(new Map<string, ProductInStock>());

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");

  return Effect.gen(function* () {
    const rows = yield* DB.try((db) =>
      db.select<
        Pick<
          DB.Product,
          | "product_id"
          | "product_name"
          | "product_stock"
          | "product_barcode"
          | "product_capital"
          | "product_price"
        >[]
      >(
        `SELECT product_id, product_name, product_stock, product_barcode, product_capital, product_price
         FROM products WHERE product_id IN (${placeholders})`,
        ids,
      ),
    );

    const map = new Map<string, ProductInStock>();
    for (const r of rows) {
      map.set(r.product_id, {
        name: r.product_name,
        stock: r.product_stock,
        capital: r.product_capital,
        price: r.product_price,
        barcode: r.product_barcode,
        id: r.product_id,
      });
    }

    const duplicates: { new: string; current: string }[] = [];
    for (const r of rows) {
      if (r.product_barcode === null) continue;
      for (const product of products) {
        if (product.product !== undefined) continue;
        if (product.barcode.trim() === "") continue;
        if (product.barcode.trim() === r.product_barcode) {
          duplicates.push({ current: r.product_name, new: product.name });
        }
      }
    }
    if (duplicates.length > 0) return yield* Effect.fail(new ManyDuplicateError(duplicates));

    return map;
  });
}
