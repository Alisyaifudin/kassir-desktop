import { DefaultError, tryResult } from "~/lib/utils";
import { getCache, setCache } from "./caches";
import { getDB } from "../instance";

type Input = {
  name: string;
  value: number;
  kind: DB.ValueKind;
};

export async function add({ name, value, kind }: Input): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.execute(`INSERT INTO extras (extra_name, extra_value, extra_kind) VALUES ($1, $2, $3)`, [
        name,
        value,
        kind,
      ]),
  });
  if (errMsg !== null) return errMsg;
  const id = res.lastInsertId;
  if (id === undefined) return "Aplikasi bermasalah";
  const cache = getCache();
  if (cache !== null) {
    setCache((prev) => [...prev, { id, name, value, kind }]);
  }
  return null;
}
