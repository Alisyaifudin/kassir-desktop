import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function add(name: string) {
  const id = generateId();
  const now = Date.now();
  return Effect.gen(function* () {
    const count = yield* DB.try((db) =>
      db.select<{ count: number }[]>(`SELECT COUNT(*) AS count FROM money_kind`),
    ).pipe(Effect.map((r) => r[0].count));
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO money_kind (money_kind_id, money_kind_name, money_kind_type, 
         money_kind_ordering, money_kind_updated_at, money_kind_sync_at) VALUES ($1, $2, 'absolute', $3, $4, null)`,
        [id, name, count, now],
      ),
    ).pipe(Effect.asVoid);
  });
}
