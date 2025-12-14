import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

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
};

export async function add({
  id,
  tab,
  price,
  product,
  name,
  barcode,
  qty,
  stock,
}: Data): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
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
        ],
      ),
  });
  return errMsg;
}
