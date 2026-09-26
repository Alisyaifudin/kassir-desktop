import { TX } from "../instance";
import { Effect } from "effect";

type Output = { tab: number };

export function all(mode: TX.Mode) {
  return Effect.gen(function* () {
    const res = yield* TX.try((tx) =>
      tx.select<Output[]>("SELECT tab FROM transactions WHERE tx_mode = ?", [mode]),
    );
    const tabs: number[] = res.map((r) => r.tab);
    return tabs;
  });
}
