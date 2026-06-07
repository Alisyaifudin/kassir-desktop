import { Effect } from "effect";
import { DB } from "../instance";

export function getCurrentMoney(pocketId: string) {
  return Effect.gen(function* () {
    const res = yield* DB.select<{ money_value: number; timestamp: number }[]>(
      "SELECT money_value, timestamp FROM money WHERE pocket_id = $1 ORDER BY timestamp DESC LIMIT 1",
      [pocketId],
    );
    if (res.length === 0) return undefined;
    return {
      value: res[0].money_value,
      timestamp: res[0].timestamp,
    };
  });
}
