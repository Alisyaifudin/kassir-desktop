import { Effect } from "effect";
import { DB } from "../instance";

export function getAll(kindId: string) {
  return DB.try((db) =>
    db.select<Omit<DB.Money, "money_kind_id">[]>("SELECT * FROM money WHERE money_kind_id = $1", [
      kindId,
    ]),
  ).pipe(
    Effect.map((rows) =>
      rows.map((r) => ({
        value: r.money_value,
        timestamp: r.timestamp,
        note: r.money_note,
        id: r.money_id,
      })),
    ),
  );
}
