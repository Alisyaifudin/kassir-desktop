import { Effect } from "effect";
import { TX } from "../instance";

export function mode(tab: number, mode: TX.Mode) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_mode = $1 WHERE tab = $2`, [mode, tab]),
  ).pipe(Effect.asVoid);
}
