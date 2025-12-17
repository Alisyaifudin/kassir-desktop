import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import { Money } from "./get-by-range";

export async function getLast(
  timestamp: number,
  kind: DB.MoneyEnum
): Promise<Result<DefaultError, Money | null>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<DB.Money[]>(
        "SELECT * FROM money WHERE money_kind = $1 AND timestamp < $2 ORDER BY timestamp DESC LIMIT 1",
        [kind, timestamp]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  if (res.length === 0) return ok(null);
  return ok({ timestamp: res[0].timestamp, value: res[0].money_value, kind: res[0].money_kind });
}
