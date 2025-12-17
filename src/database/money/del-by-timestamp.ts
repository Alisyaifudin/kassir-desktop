import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function delByTimestamp(timestamp: number): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () => db.execute("DELETE FROM money WHERE timestamp = $1", [timestamp]),
  });
  return errMsg;
}
