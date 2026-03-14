import { Effect } from "effect";
import { TX } from "../instance";

export function query(tab: number, query: string) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_query = $1 WHERE tab = $2`, [query, tab]),
  ).pipe(Effect.asVoid);
}
