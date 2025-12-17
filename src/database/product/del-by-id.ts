import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import { getCache, setCache } from "./caches";

export async function delById(id: number): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () => db.select<DB.Product[]>("DELETE FROM products WHERE product_id = $1", [id]),
  });
  if (errMsg !== null) return errMsg;
  const cache = getCache();
  if (cache !== null) {
    setCache((prev) => prev.filter((p) => p.id !== id));
  }
  return null;
}
