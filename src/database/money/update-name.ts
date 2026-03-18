import { Effect } from "effect";
import { DB } from "../instance";

export function updateName(kindId: number, name: string) {
  return DB.try((db) =>
    db.execute("UPDATE money_kind SET money_kind_name = $1 WHERE money_kind_id = $2", [
      name,
      kindId,
    ]),
  ).pipe(Effect.asVoid);
}
