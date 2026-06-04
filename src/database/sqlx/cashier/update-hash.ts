import { Effect } from "effect";
import { DB } from "../instance";

export function updateCashierHash(id: string, hash: string) {
  return DB.execute("UPDATE cashiers SET cashier_hash = $1 WHERE cashier_id = $2", [hash, id]).pipe(
    Effect.asVoid,
  );
}
