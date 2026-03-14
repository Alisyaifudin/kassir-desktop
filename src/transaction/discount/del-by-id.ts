import { Effect } from "effect";
import { TX } from "../instance";

export function delById(id: string) {
  return TX.try((tx) => tx.execute(`DELETE FROM discounts WHERE disc_id = $1`, [id])).pipe(
    Effect.asVoid,
  );
}
