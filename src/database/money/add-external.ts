import { Effect } from "effect";
import { DB } from "../instance";
import { DuplicateError } from "../product/update-info";

export function addExternal(
  kindId: number,
  {
    timestamp,
    note,
    value,
  }: {
    value: number;
    note: string;
    timestamp: number;
  },
) {
  return Effect.gen(function* () {
    const check = yield* DB.try((db) =>
      db.select<{ timestamp: number }[]>("SELECT timestamp FROM money WHERE timestamp = $1", [
        timestamp,
      ]),
    );
    if (check.length > 0)
      return yield* Effect.fail(new DuplicateError(check[0].timestamp.toString()));
    yield* DB.try((db) =>
      db.execute(
        "INSERT INTO money (timestamp, money_kind_id, money_value, money_note) VALUES ($1, $2, $3, $4)",
        [timestamp, kindId, value, note],
      ),
    );
  });
}
