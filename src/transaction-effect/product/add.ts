import { Effect } from "effect";
import { TX } from "../instance";

type Data = {
  tab: number;
  id: string;
  product?: {
    id: number;
    price: number;
    name: string;
  };
  name: string;
  barcode: string;
  price: number;
  qty: number;
  stock: number;
  discounts: {
    id: string;
    value: number;
    kind: TX.DiscKind;
  }[];
};

export function add({ id, tab, price, product, name, barcode, qty, stock, discounts }: Data) {
  return Effect.gen(function* () {
    yield* TX.try((tx) =>
      tx.execute(
        `INSERT INTO products (product_id, tab, product_name, product_barcode, product_price, 
         product_qty, product_stock, db_product_id, db_product_name, db_product_price) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          tab,
          name,
          barcode,
          price,
          qty,
          stock,
          product?.id ?? null,
          product?.name ?? null,
          product?.price ?? null,
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
