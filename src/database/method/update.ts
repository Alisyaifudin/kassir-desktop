import { tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function update(id: number, name: string): Promise<"Aplikasi bermasalah" | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () => db.execute("UPDATE methods SET method_name = $1 WHERE method_id = $2", [name, id]),
  });
  return errMsg;
}
