import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function add({ name, role, hash }: { name: string; role: DB.Role; hash: string }) {
  const id = generateId();
  return DB.try((db) =>
    db.execute(
      "INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash) VALUES ($1, $2, $3)",
      [id, name, role, hash],
    ),
  ).pipe(Effect.asVoid);
}
