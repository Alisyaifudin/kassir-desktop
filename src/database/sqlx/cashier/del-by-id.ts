import { DB } from "../instance";
import { Effect } from "effect";

export function deleteCashierById(id: string) {
  return DB.execute("DELETE FROM cashiers WHERE cashier_id = $1", [id]).pipe(Effect.asVoid);
}
