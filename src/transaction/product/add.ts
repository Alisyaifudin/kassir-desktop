import { Effect } from "effect";
import { TX } from "../instance";

type Data = {
  tab: number;
  id: string;
  product?: {
    id: string;
    price: number;
    name: string;
    stock: number;
    capital: number;
  };
  name: string;
  barcode: string;
  price: number;
  qty: number;
  discounts: {
    id: string;
    value: number;
    kind: TX.DiscKind;
  }[];
};

export function add({ id, tab, price, product, name, barcode, qty, discounts }: Data) {
  return Effect.gen(function* () {
    const now = Date.now();
    yield* TX.try((tx) =>
      tx.execute(
        `INSERT INTO products (product_id, tab, product_name, product_barcode, product_price, 
         product_qty, product_created_at, db_product_id, db_product_name, db_product_price, db_product_stock,
         db_product_capital) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          tab,
          name,
          barcode,
          price,
          qty,
          now,
          product?.id ?? null,
          product?.name ?? null,
          product?.price ?? null,
          product?.stock ?? null,
          product?.capital ?? null,
        ],
      ),
    );
    yield* Effect.all(
      discounts.map((disc) => addDiscount(id, { id: disc.id, kind: disc.kind, value: disc.value })),
      { concurrency: "unbounded" },
    );
  });
}

export function addDiscount(productId: string, { id, kind, value }: Data["discounts"][number]) {
  return TX.try((tx) =>
    tx.execute(
      `INSERT INTO discounts (product_id, disc_id, disc_value, disc_kind) 
         VALUES ($1, $2, $3, $4)`,
      [productId, id, value, kind],
    ),
  ).pipe(Effect.asVoid);
}
