import { tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function delById(id: number): Promise<"Aplikasi bermasalah" | null> {
  const db = await getDB();
  const now = Date.now();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE methods SET method_deleted_at = $1 WHERE method_id = $2", [now, id]),
  });
  return errMsg;
}
