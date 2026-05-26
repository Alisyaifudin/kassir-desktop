import { Effect } from "effect";
import { TX } from "../instance";

export function del(tab: number) {
  return TX.try((tx) => tx.execute("DELETE FROM transactions WHERE tab = $1", [tab])).pipe(
    Effect.asVoid,
  );
}
