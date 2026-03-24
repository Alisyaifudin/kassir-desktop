import { Effect } from "effect";
import { TX } from "../instance";

export type Product = {
  id: string;
  tab: number;
  product?: {
    id: string;
    price: number;
    name: string;
    capital: number;
    stock: number;
  };
  name: string;
  barcode: string;
  price: number;
  qty: number;
  discounts: {
    id: string;
    value: number;
    kind: "percent" | "number" | "pcs";
  }[];
};

type Discount = Product["discounts"][number];

type Output = {
  product_id: string;
  db_product_id: string | null;
  db_product_price: number | null;
  db_product_capital: number | null;
  db_product_stock: number | null;
  db_product_name: string | null;
  product_name: string;
  product_barcode: string;
  product_price: number;
  product_qty: number;
  disc_id: string | null;
  disc_value: number | null;
  disc_kind: "percent" | "number" | "pcs" | null;
};

export function getByTab(tab: number) {
  return Effect.gen(function* () {
    const rows = yield* TX.try((tx) =>
      tx.select<Output[]>(
        `SELECT products.product_id, db_product_id, db_product_price, db_product_capital, 
         db_product_stock, db_product_name, product_name, product_barcode, product_price, 
         product_qty, disc_id, disc_value, disc_kind
         FROM products LEFT JOIN discounts ON products.product_id = discounts.product_id
         WHERE tab = $1 ORDER BY product_order, disc_order`,
        [tab],
      ),
    );
    return collect(tab, rows);
  });
}

function collect(tab: number, rows: Output[]) {
  const items: Map<string, Product> = new Map();
  for (const row of rows) {
    const discount = getDiscount(row.disc_id, row.disc_value, row.disc_kind);
    const item = items.get(row.product_id);
    if (item === undefined) {
      const product = getProduct({
        id: row.db_product_id,
        capital: row.db_product_capital,
        name: row.db_product_name,
        stock: row.db_product_stock,
        price: row.db_product_price,
      });
      const item: Product = {
        barcode: row.product_barcode,
        discounts: discount === undefined ? [] : [discount],
        id: row.product_id,
        name: row.product_name,
        price: row.product_price,
        qty: row.product_qty,
        tab,
        product,
      };
      items.set(row.product_id, item);
      continue;
    }
    if (discount === undefined) continue;
    item.discounts.push(discount);
    items.set(row.product_id, item);
  }
  const prods = Array.from(items.values());
  return prods;
}

function getProduct({
  id,
  price,
  name,
  capital,
  stock,
}: {
  id: string | null;
  price: number | null;
  name: string | null;
  capital: number | null;
  stock: number | null;
}) {
  if (id !== null && price !== null && name !== null && capital !== null && stock !== null) {
    return { id, price, name, capital, stock };
  }
  return undefined;
}

function getDiscount(
  id: string | null,
  value: number | null,
  kind: "percent" | "number" | "pcs" | null,
): undefined | Discount {
  if (id !== null && value !== null && kind !== null) {
    return { id, value, kind };
  }
  return undefined;
}
