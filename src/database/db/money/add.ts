import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function add(value: number, kindId: string, note: string) {
  const now = Date.now();
  const id = generateId();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO money (money_id, timestamp, money_kind_id, money_value, money_note, 
       money_updated_at, money_sync_at) 
       VALUES ($1, $2, $3, $4, $5, $6, null)`,
      [id, now, kindId, value, note, now],
    ),
  ).pipe(Effect.asVoid);
}
