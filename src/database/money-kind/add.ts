import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function add(name: string) {
  const id = generateId();
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO money_kind (money_kind_id, money_kind_name, money_kind_type, 
       money_kind_updated_at, money_kind_sync_at) VALUES ($1, $2, 'absolute', $3, null)`,
      [id, name, now],
    ),
  ).pipe(
    Effect.asVoid,
  );
}
