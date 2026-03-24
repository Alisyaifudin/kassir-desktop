import { Effect } from "effect";
import { DB } from "../instance";

export function updateType(id: string, type: DB.MoneyType) {
  return DB.try((db) =>
    db.execute("UPDATE money_kind SET money_kind_type = $1 WHERE money_kind_id = $2", [type, id]),
  ).pipe(
    Effect.asVoid,
  );
}
