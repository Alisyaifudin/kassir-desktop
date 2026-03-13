import { Effect } from "effect";
import { tx } from "~/transaction-effect";
import { Result } from "~/lib/result";
import { TabInfo } from "~/transaction-effect/transaction/get-all";
import { useOutletContext } from "react-router";

const KEY = "tabs";

export function useGetTabs() {
  const res = Result.use({
    fn: () => programTabs,
    key: KEY,
  });
  return res;
}

const programTabs = Effect.gen(function* () {
  const tabs = yield* tx.transaction.get.all();
  if (tabs.length === 0) {
    const info = yield* tx.transaction.add.new();
    return [info] as [TabInfo, ...TabInfo[]];
  }
  return tabs as [TabInfo, ...TabInfo[]];
});

export function revalidateTabs() {
  Result.revalidate(KEY);
}

export function useTabs() {
  const context = useOutletContext<{ tabs: [TabInfo, ...TabInfo[]] } | undefined>();
  if (context?.tabs === undefined) throw new Error("Outside context");
  const tabs = context.tabs;
  return tabs;
}
