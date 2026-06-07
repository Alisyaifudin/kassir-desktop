import { Effect } from "effect";
import { DB } from "../instance";

export function getLastMoney(pocketId: string, timestamp: number) {
  return Effect.gen(function* () {
    const res = yield* DB.select<{ money_value: number }[]>(
      "SELECT money_value FROM money WHERE pocket_id = $1 AND timestamp < $2 ORDER BY timestamp DESC LIMIT 1",
      [pocketId, timestamp],
    );
    if (res.length === 0) return 0;
    return res[0].money_value;
  });
}
