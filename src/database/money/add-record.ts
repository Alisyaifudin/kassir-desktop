import { Effect } from "effect";
import { DB } from "../instance";

export function addRecord(value: number, kindId: number, note: string) {
  const timestamp = Date.now();
  return DB.try((db) =>
    db.execute(
      "INSERT INTO money (timestamp, money_kind_id, money_value, money_note) VALUES ($1, $2, $3, $4)",
      [timestamp, kindId, value, note],
    ),
  ).pipe(Effect.asVoid);
}
