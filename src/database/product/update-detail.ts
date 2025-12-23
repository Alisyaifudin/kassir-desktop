import { DefaultError } from "~/lib/utils";
import { getDB } from "../instance";
import { getCache, setCache } from "./caches";

type Input = {
  id: number;
  name: string;
  price: number;
  stock: number;
  capital: number;
  barcode: string | null;
  note: string;
};

export async function updateDetail({
  id,
  name,
  price,
  stock,
  capital,
  barcode,
  note,
}: Input): Promise<DefaultError | "Barang dengan kode tersebut sudah ada" | null> {
  const db = await getDB();
  try {
    await db.execute(
      `UPDATE products SET product_name = $1, product_price = $2, product_stock = $3, product_capital = $4,
       product_barcode = $5, product_note = $6 WHERE product_id = $7`,
      [name, price, stock, capital, barcode, note, id]
    );
    const cache = getCache();
    if (cache !== null) {
      setCache((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            return {
              id,
              capital,
              name,
              price,
              stock,
              barcode: barcode ?? undefined,
            };
          }
          return p;
        })
      );
    }
    return null;
  } catch (error) {
    if (typeof error === "string") {
      if (error.includes("UNIQUE constraint failed: products.product_barcode")) {
        return "Barang dengan kode tersebut sudah ada";
      }
    }
    return "Aplikasi bermasalah";
  }
}
