import { DefaultError, err, NotFound, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Product = {
  id: number;
  barcode?: string;
  name: string;
  price: number;
  stock: number;
  capital: number;
  note: string;
};

export async function getById(id: number): Promise<Result<DefaultError | NotFound, Product>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.Product[]>("SELECT * FROM products WHERE product_id = $1", [id]),
  });
  if (errMsg !== null) return err(errMsg);
  if (res.length === 0) return err("Tidak ditemukan");
  return ok({
    id: res[0].product_id,
    barcode: res[0].product_barcode ?? undefined,
    name: res[0].product_name,
    price: res[0].product_price,
    stock: res[0].product_stock,
    capital: res[0].product_capital,
    note: res[0].product_note,
  });
}
