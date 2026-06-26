import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function addNewCashier({
  name,
  role,
  hash,
}: {
  name: string;
  role: DBNamespace.Role;
  hash: string;
}) {
  const id = generateId();
  return DB.execute(
    "INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash) VALUES ($1, $2, $3, $4)",
    [id, name, role, hash],
  ).pipe(Effect.as(id));
}
