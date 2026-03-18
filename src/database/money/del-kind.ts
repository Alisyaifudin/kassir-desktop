import { Effect } from "effect";
import { DB } from "../instance";

export function deleteKind(id: number) {
  return DB.try((db) => db.execute("DELETE FROM money_kind WHERE money_kind_id = $1", [id])).pipe(
    Effect.asVoid,
  );
}
