import { Effect } from "effect";
import { TX } from "../instance";

export function fix(tab: number, fix: number) {
  if (fix < 0 || fix > 5) return Effect.void;
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_fix = $1 WHERE tab = $2`, [fix, tab]),
  ).pipe(Effect.asVoid);
}
