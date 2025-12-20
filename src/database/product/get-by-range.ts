import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

type Raw = {
  kind: "raw";
  name: string;
  id: number;
  price: number;
  capital: number;
  qty: number;
  timestamp: number;
  total: number;
  mode: DB.Mode;
};

type Prod = {
  kind: "product";
  id: number;
  name: string;
  barcode?: string;
  price: number;
  capital: number;
  qty: number;
  mode: DB.Mode;
  items: {
    id: number;
    timestamp: number;
    name: string;
    price: number;
    qty: number;
    total: number;
  }[];
};

export type Item = Raw | Prod;

type Input = {
  product_capital: number | null;
  product_barcode: string | null;
  product_id: number | null;
  product_price: number | null;
  product_name: string | null;
  record_product_name: string;
  record_product_id: number;
  record_product_price: number;
  record_product_capital: number;
  record_product_total: number;
  record_product_qty: number;
  timestamp: number;
  record_mode: DB.Mode;
};

export async function byRange(start: number, end: number): Promise<Result<DefaultError, Item[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<Input[]>(
        `SELECT product_price, product_capital, product_barcode, products.product_id, product_name, 
         record_product_name, record_product_id, record_product_price, record_product_capital, 
         records.timestamp, record_product_qty, record_product_total, record_mode
         FROM record_products
         INNER JOIN records ON records.timestamp = record_products.timestamp
         LEFT JOIN products ON products.product_id = record_products.product_id
         WHERE record_products.timestamp BETWEEN $1 AND $2
         ORDER BY record_products.timestamp DESC, record_product_name`,
        [start, end]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  const raws: Raw[] = [];
  const prods: Map<string, Prod> = new Map();
  for (const r of res) {
    const product = collectProduct(
      r.product_id,
      r.product_name,
      r.product_barcode,
      r.product_capital,
      r.product_price
    );
    if (product === null) {
      raws.push({
        kind: "raw",
        mode: r.record_mode,
        capital: r.record_product_capital,
        id: r.record_product_id,
        name: r.record_product_name,
        price: r.record_product_price,
        qty: r.record_product_qty,
        timestamp: r.timestamp,
        total: r.record_product_total,
      });
    } else {
      const p = prods.get(`${product.id}-${r.record_mode}`);
      const item = {
        id: r.record_product_id,
        price: r.record_product_price,
        qty: r.record_product_qty,
        timestamp: r.timestamp,
        name: r.record_product_name,
        total: r.record_product_total,
      };
      if (p === undefined) {
        prods.set(`${product.id}-${r.record_mode}`, {
          kind: "product",
          capital: product.capital,
          price: product.price,
          name: product.name,
          barcode: product.barcode,
          id: product.id,
          qty: item.qty,
          items: [item],
          mode: r.record_mode,
        });
      } else {
        p.items.push(item);
        p.qty += item.qty;
        prods.set(`${p.id}-${p.mode}`, p);
      }
    }
  }
  const result = [...raws, ...Array.from(prods.values())];
  result.sort((a, b) => a.name.localeCompare(b.name));
  return ok(result);
}

type Product = {
  id: number;
  name: string;
  barcode?: string;
  capital: number;
  price: number;
};

function collectProduct(
  id: number | null,
  name: string | null,
  barcode: string | null,
  capital: number | null,
  price: number | null
): Product | null {
  if (id === null || name === null || capital === null || price === null) {
    return null;
  }
  return {
    id,
    name,
    capital,
    barcode: barcode ?? undefined,
    price,
  };
}
