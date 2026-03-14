import { Effect } from "effect";
import { DB } from "../instance";

export function updateToCredit(timestamp: number) {
  return DB.try((db) =>
    db.execute(
      "UPDATE records SET record_is_credit = 1, record_pay = 0, record_rounding = 0 WHERE timestamp = $1",
      [timestamp],
    ),
  ).pipe(Effect.asVoid);
}
