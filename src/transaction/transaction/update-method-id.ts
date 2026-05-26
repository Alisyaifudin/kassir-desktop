import { Effect } from "effect";
import { TX } from "../instance";

export function methodId(tab: number, methodId: string) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_method_id = $1 WHERE tab = $2`, [methodId, tab]),
  ).pipe(Effect.asVoid);
}
