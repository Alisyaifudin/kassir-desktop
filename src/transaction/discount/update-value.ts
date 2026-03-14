import { Effect } from "effect";
import { TX } from "../instance";

export function value(id: string, value: number) {
  return TX.try((tx) =>
    tx.execute(`UPDATE discounts SET disc_value = $1 WHERE disc_id = $2`, [value, id]),
  ).pipe(Effect.asVoid);
}
