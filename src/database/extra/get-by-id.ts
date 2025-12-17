import { DefaultError, err, NotFound, ok, Result, tryResult } from "~/lib/utils";
import { Extra, getCache } from "./caches";
import { getDB } from "../instance";

export async function getById(id: number): Promise<Result<DefaultError | NotFound, Extra>> {
  const db = await getDB();
  const cache = getCache();
  if (cache !== null) {
    const find = cache.find((c) => c.id === id);
    if (find === undefined) return err("Tidak ditemukan");
    return ok(find);
  }
  const [errMsg, res] = await tryResult({
    run: () => db.select<DB.Extra[]>("SELECT * FROM extras WHERE extra_id = $1", [id]),
  });
  if (errMsg !== null) return err(errMsg);
  if (res.length === 0) return err("Tidak ditemukan");
  const r = res[0];
  return ok({
    id: r.extra_id,
    kind: r.extra_kind,
    name: r.extra_name,
    value: r.extra_value,
  });
}
