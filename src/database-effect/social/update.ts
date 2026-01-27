import { DB } from "../instance";
import { Effect } from "effect";

export function update(id: number, name: string, value: string) {
  return DB.try((db) =>
    db.execute("UPDATE socials SET social_name = $1, social_value = $2 WHERE social_id = $3", [
      name,
      value,
      id,
    ]),
  ).pipe(Effect.asVoid);
}
