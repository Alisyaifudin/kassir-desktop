import { Effect } from "effect";
import { DB } from "../instance";

export function updateRole(id: string, role: DB.Role) {
  return DB.execute("UPDATE cashiers SET cashier_role = $1 WHERE cashier_id = $2", [role, id]).pipe(
    Effect.asVoid,
  );
}
