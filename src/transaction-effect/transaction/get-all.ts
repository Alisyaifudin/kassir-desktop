import { TX } from "../instance";
import { Effect } from "effect";

export type TabInfo = {
  tab: number;
  mode: TX.Mode;
};

type Output = { tab: number; tx_mode: TX.Mode };

export function all() {
  return Effect.gen(function* () {
    const res = yield* TX.try((tx) => tx.select<Output[]>("SELECT tab, tx_mode FROM transactions"));
    const tabs: TabInfo[] = res.map((r) => ({ tab: r.tab, mode: r.tx_mode }));
    return tabs;
  });
}
