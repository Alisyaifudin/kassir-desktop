import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import { getCache, setCache } from "./caches";

type Input = {
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
  capital: number;
  note: string;
};

export async function add({
  name,
  barcode,
  price,
  stock,
  capital,
  note,
}: Input): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.execute(
        `INSERT INTO products (product_name, product_barcode, product_price, product_stock, product_capital, product_note) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, barcode, price, stock, capital, note]
      ),
  });
  if (errMsg !== null) return errMsg;
  const id = res.lastInsertId;
  if (id === undefined) return "Aplikasi bermasalah";
  const cache = getCache();
  if (cache !== null) {
    setCache((prev) => [
      ...prev,
      { id, name, barcode: barcode ?? undefined, capital, price, stock },
    ]);
  }
  return null;
}
