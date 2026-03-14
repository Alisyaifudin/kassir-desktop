import { Effect } from "effect";
import { DB } from "../instance";

export function add(name: string, value: string) {
  return DB.try((db) =>
    db.execute("INSERT INTO socials (social_name, social_value) VALUES ($1, $2)", [name, value]),
  ).pipe(Effect.asVoid);
}
