import { Effect } from "effect";
import { DB } from "../instance";

export function add(value: number, kind: DB.MoneyEnum, note: string) {
  const timestamp = Date.now();
  return DB.try((db) =>
    db.execute(
      "INSERT INTO money (timestamp, money_kind, money_value, note) VALUES ($1, $2, $3, $4)",
      [timestamp, kind, value, note],
    ),
  ).pipe(Effect.asVoid);
}
