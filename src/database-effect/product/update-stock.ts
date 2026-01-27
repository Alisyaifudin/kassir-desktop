import { DefaultError } from "~/lib/utils";
import { getDB } from "../instance";
import { getCache, setCache } from "./caches";

type Input = {
  id: number;
  stock: number;
};

export async function updateStock({ id, stock }: Input): Promise<DefaultError | null> {
  const db = await getDB();
  try {
    await db.execute(`UPDATE products SET product_stock = $1 WHERE product_id = $2`, [stock, id]);
    const cache = getCache();
    if (cache !== null) {
      setCache((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            return {
              ...p,
              stock,
            };
          }
          return p;
        })
      );
    }
    return null;
  } catch (error) {
    return "Aplikasi bermasalah";
  }
}
