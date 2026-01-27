import { DefaultError, tryResult } from "~/lib/utils";
import { getCache, setCache } from "./caches";
import { getDB } from "../instance";

export async function delById(id: number): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () => db.execute("DELETE FROM extras WHERE extra_id = $1", [id]),
  });
  if (errMsg !== null) return errMsg;
  const cache = getCache();
  if (cache !== null) {
    setCache((prev) => prev.filter((p) => p.id !== id));
  }
  return null;
}
