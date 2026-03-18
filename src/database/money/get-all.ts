import { Effect } from "effect";
import { DB } from "../instance";

export function getAll(kindId: number) {
  return DB.try((db) =>
    db.select<DB.Money[]>("SELECT * FROM money WHERE money_kind_id = $1", [kindId]),
  ).pipe(
    Effect.map((rows) =>
      rows.map((r) => ({
        kind: r.money_kind,
        value: r.money_value,
        timestamp: r.timestamp,
        note: r.money_note,
      })),
    ),
  );
}
