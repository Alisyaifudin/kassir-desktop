import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getCache, Extra, setCache } from "./caches";
import { getDB } from "../instance";

export async function all(): Promise<Result<DefaultError, Extra[]>> {
  const cache = getCache();
  if (cache !== null) return ok(cache);
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<DB.Extra[]>("SELECT extra_id, extra_name, extra_value, extra_kind FROM extras"),
  });
  if (errMsg !== null) return err(errMsg);
  const items: Extra[] = res.map((r) => ({
    id: r.extra_id,
    kind: r.extra_kind,
    name: r.extra_name,
    value: r.extra_value,
  }));
  setCache(items);
  return ok(items);
}
