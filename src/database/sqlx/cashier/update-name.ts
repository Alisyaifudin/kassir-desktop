import { Effect } from "effect";
import { DB } from "../instance";

export function updateCashierName(id: string, name: string) {
  return DB.execute("UPDATE cashiers SET cashier_name = $1 WHERE cashier_id = $2", [name, id]).pipe(
    Effect.flatMap(() => Effect.void),
  );
}
