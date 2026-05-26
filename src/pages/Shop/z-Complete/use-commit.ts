import { useCallback } from "react";
import { Effect } from "effect";
import { TabInfo } from "~/transaction/transaction/get-all";
import { resetStore } from "../use-transaction";
import { programClearTab } from "./program-clear-tab";

export function useCommit() {
  return useCallback(async (tab: number, tabs: TabInfo[]) => {
    resetStore(tab);
    return await Effect.runPromise(programClearTab(tab, tabs));
  }, []);
}
