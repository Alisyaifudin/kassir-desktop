import { Effect } from "effect";
import { TX } from "../instance";

export function note(tab: number, note: string) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_note = $1 WHERE tab = $2`, [note, tab]),
  ).pipe(Effect.asVoid);
}
