import { Effect } from "effect";
import { DB } from "../instance";

export function add({ name, role, hash }: { name: string; role: DB.Role; hash: string }) {
  return DB.try((db) =>
    db.execute(
      "INSERT INTO cashiers (cashier_name, cashier_role, cashier_hash) VALUES ($1, $2, $3)",
      [name, role, hash],
    ),
  ).pipe(Effect.asVoid);
}
