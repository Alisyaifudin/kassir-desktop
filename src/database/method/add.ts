import { tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function add(
  name: string,
  kind: DB.MethodEnum
): Promise<"Aplikasi bermasalah" | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("INSERT INTO methods (method_name, method_kind) VALUES ($1, $2)", [name, kind]),
  });
  return errMsg;
}
