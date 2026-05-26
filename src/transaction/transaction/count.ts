import { Effect } from "effect";
import { TX } from "../instance";

export function count() {
  return TX.try((tx) =>
    tx.select<{ count: number }[]>("SELECT COUNT(*) as count FROM transactions"),
  ).pipe(Effect.map((res) => res[0].count));
}
