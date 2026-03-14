import { Effect } from "effect";
import { TX } from "../instance";

export function kind(id: string, kind: TX.DiscKind) {
  return TX.try((tx) =>
    tx.execute(`UPDATE discounts SET disc_kind = $1 WHERE disc_id = $2`, [kind, id]),
  ).pipe(Effect.asVoid);
}
