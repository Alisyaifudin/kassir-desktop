import { err, ok, Result, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export type Product = {
  id: string;
  tab: number;
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
    kind: "percent" | "number" | "pcs";
  }[];
};

type Discount = Product["discounts"][number];

type Output = {
  product_id: string;
  db_product_id: number | null;
  db_product_price: number | null;
  db_product_name: string | null;
  product_name: string;
  product_barcode: string;
  product_price: number;
  product_qty: number;
  product_stock: number;
  disc_id: string | null;
  disc_value: number | null;
  disc_kind: "percent" | "number" | "pcs" | null;
};

export async function getByTab(tab: number): Promise<Result<"Aplikasi bermasalah", Product[]>> {
  const tx = await getTX();
  const [errMsg, rows] = await tryResult({
    run: () =>
      tx.select<Output[]>(
        `SELECT products.product_id, db_product_id, db_product_price, db_product_name,
         product_name, product_barcode, product_price, product_qty, product_stock, 
         disc_id, disc_value, disc_kind
         FROM products LEFT JOIN discounts
         WHERE tab = $1`,
        [tab],
      ),
  });
  if (errMsg !== null) return err("Aplikasi bermasalah");
  const items: Map<string, Product> = new Map();
  for (const row of rows) {
    const discount = getDiscount(row.disc_id, row.disc_value, row.disc_kind);
    const item = items.get(row.product_id);
    if (item === undefined) {
      const product = getProduct(row.db_product_id, row.db_product_price, row.db_product_name);
      const item: Product = {
        barcode: row.product_barcode,
        discounts: discount === undefined ? [] : [discount],
        id: row.product_id,
        name: row.product_name,
        price: row.product_price,
        qty: row.product_qty,
        stock: row.product_stock,
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
  return ok(Array.from(items.values()));
}

function getProduct(id: number | null, price: number | null, name: string | null) {
  if (id !== null && price !== null && name !== null) {
    return { id, price, name };
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
