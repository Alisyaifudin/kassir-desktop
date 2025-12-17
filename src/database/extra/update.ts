import { DefaultError, tryResult } from "~/lib/utils";
import { Extra, getCache, setCache } from "./caches";
import { getDB } from "../instance";

export async function update({ id, kind, name, value }: Extra): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        "UPDATE extras SET extra_name = $1, extra_kind = $2, extra_value = $3 WHERE extra_id = $4",
        [name, kind, value, id]
      ),
  });
  if (errMsg !== null) return errMsg;
  const cache = getCache();
  if (cache !== null) {
    setCache((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            id,
            kind,
            name,
            value,
          };
        }
        return p;
      })
    );
  }
  return null;
}
