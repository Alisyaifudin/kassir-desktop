import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";
import Database from "@tauri-apps/plugin-sql";
import { generateId } from "~/lib/random";

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
    value: number;
    kind: TX.DiscKind;
  }[];
};

export async function addMany(data: Data[]): Promise<DefaultError | null> {
  const tx = await getTX();
  const promises: Promise<DefaultError | null>[] = [];
  for (const d of data) {
    promises.push(addProduct(tx, d));
  }
  const res = await Promise.all(promises);
  for (const errMsg of res) {
    if (errMsg !== null) return errMsg;
  }
  return null;
}

async function addProduct(
  tx: Database,
  { discounts, id, tab, price, product, name, barcode, qty, stock }: Data
): Promise<DefaultError | null> {
  const [errProd] = await tryResult({
    run: async () =>
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
        ]
      ),
  });
  if (errProd !== null) return errProd;
  const promises: Promise<DefaultError | null>[] = [];
  for (const d of discounts) {
    promises.push(addDiscount(tx, id, d));
  }
  const res = await Promise.all(promises);
  for (const errMsg of res) {
    if (errMsg !== null) return errMsg;
  }
  return null;
}

async function addDiscount(
  tx: Database,
  productId: string,
  { kind, value }: Data["discounts"][number]
): Promise<DefaultError | null> {
  const id = generateId();
  const [errMsg] = await tryResult({
    run: async () =>
      tx.execute(
        `INSERT INTO discounts (product_id, disc_id, disc_value, disc_kind) 
         VALUES ($1, $2, $3, $4)`,
        [productId, id, value, kind]
      ),
  });
  return errMsg;
}
