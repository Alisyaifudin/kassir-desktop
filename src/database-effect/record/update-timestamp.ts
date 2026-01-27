import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateTimestamp(
  timestamp: number,
  newTimestamp: number
): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE records SET timestamp = $1 WHERE timestamp = $2", [
        newTimestamp,
        timestamp,
      ]),
  });
  return errMsg;
}
