import { Effect } from "effect";
import { DB } from "../instance";

export function add(name: string, kind: Exclude<DB.MethodEnum, "cash">) {
  return DB.try((db) =>
    db.execute("INSERT INTO methods (method_name, method_kind) VALUES ($1, $2)", [name, kind]),
  ).pipe(Effect.asVoid);
}
