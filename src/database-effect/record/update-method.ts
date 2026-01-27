import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateMethod(
  timestamp: number,
  methodId: number
): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE records SET method_id = $1 WHERE timestamp = $2", [
        methodId,
        timestamp,
      ]),
  });
  return errMsg;
}
