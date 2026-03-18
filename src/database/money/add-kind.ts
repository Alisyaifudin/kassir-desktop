import { Effect } from "effect";
import { DB } from "../instance";

export function addKind(name: string) {
  console.log("inserting new pocket", name);
  return DB.try((db) =>
    db.execute("INSERT INTO money_kind (money_kind_name) VALUES ($1)", [name]),
  ).pipe(Effect.asVoid);
}
