import { Effect } from "effect";
import { DB } from "../instance";
import { DuplicateError } from "~/lib/effect-error";
import { generateId } from "~/lib/random";

export function addExternal(
  kindId: string,
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
  const now = Date.now();
  const id = generateId();
  return Effect.gen(function* () {
    const check = yield* DB.try((db) =>
      db.select<{ timestamp: number }[]>("SELECT timestamp FROM money WHERE money_id = $1", [id]),
    );
    if (check.length > 0)
      return yield* Effect.fail(new DuplicateError(check[0].timestamp.toString()));
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO money (money_id, timestamp, money_kind_id, money_value, money_note, 
         money_updated_at, money_sync_at) VALUES ($1, $2, $3, $4, $5, $6, null)`,
        [id, timestamp, kindId, value, note, now],
      ),
    );
  });
}
