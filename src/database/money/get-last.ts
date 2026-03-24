import { Effect } from "effect";
import { DB } from "../instance";

export function getLast(timestamp: number, kindId: string) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<{ money_value: number }[]>(
        "SELECT money_value FROM money WHERE money_kind_id = $1 AND timestamp < $2 ORDER BY timestamp DESC LIMIT 1",
        [kindId, timestamp],
      ),
    );
    if (res.length === 0) return 0;
    return res[0].money_value;
  });
}
