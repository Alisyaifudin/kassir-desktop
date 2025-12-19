import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateMode(timestamp: number, mode: DB.Mode): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE records SET record_mode = $1 WHERE timestamp = $2", [mode, timestamp]),
  });
  return errMsg;
}
