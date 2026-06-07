import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewMoney(value: number, pocketId: string, note: string) {
  const now = Date.now();
  const id = generateId();
  return DB.execute(
    `INSERT INTO money (money_id, timestamp, money_kind_id, money_value, money_note, 
    money_updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, now, pocketId, value, note, now],
  ).pipe(Effect.as(id));
}
