import { Effect } from "effect";
import { DB } from "../instance";

export function delById(id: number) {
  return DB.try((db) => db.execute("DELETE FROM socials WHERE social_id = $1", [id])).pipe(
    Effect.asVoid,
  );
}
