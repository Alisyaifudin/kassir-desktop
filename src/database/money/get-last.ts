import { Effect } from "effect";
import { DB } from "../instance";

export function getLast(timestamp: number, kind: DB.MoneyEnum) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.Money[]>(
        "SELECT * FROM money WHERE money_kind = $1 AND timestamp < $2 ORDER BY timestamp DESC LIMIT 1",
        [kind, timestamp],
      ),
    );
    if (res.length === 0) return null;
    return {
      timestamp: res[0].timestamp,
      value: res[0].money_value,
      kind: res[0].money_kind,
      note: res[0].note,
    };
  });
}
