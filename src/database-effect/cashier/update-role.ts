import { Effect } from "effect";
import { DB } from "../instance";

export function updateRole(name: string, role: DB.Role) {
  return DB.try((db) =>
    db.execute("UPDATE cashiers SET cashier_role = $1 WHERE cashier_name = $2", [role, name]),
  ).pipe(Effect.asVoid);
}
