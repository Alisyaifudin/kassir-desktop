import { DB } from "../instance";
import { Effect } from "effect";

export function getCountUnsync() {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<{ count: number }[]>(
        `SELECT COUNT(*) AS count FROM records WHERE record_sync_at IS NULL`,
      ),
    );
    return res[0].count;
  });
}
