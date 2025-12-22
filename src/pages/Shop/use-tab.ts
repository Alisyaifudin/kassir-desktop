import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";
import { TabInfo } from "~/transaction/transaction/get-all";
import { useAtom } from "@xstate/store/react";
import { createAtom } from "@xstate/store";

export const tabsStore = createAtom<TabInfo[]>([]);
export function useTab() {
  const [search, setSearch] = useSearchParams();
  const tabs = useAtom(tabsStore);
  const tab = getTab(search, tabs);
  function setTab(tab: number) {
    setSearch({
      tab: tab.toString(),
    });
  }
  return [tab, setTab] as const;
}

function getTab(search: URLSearchParams, tabs: TabInfo[]) {
  if (tabs.length === 0) return undefined;
  const last = tabs[tabs.length - 1].tab;
  const parsed = integer.safeParse(search.get("tab"));
  if (!parsed.success) {
    // setSearch({ tab: last.toString() });
    return last;
  }
  const tab = parsed.data;
  if (tabs.find((t) => t.tab === tab) === undefined) {
    // setSearch({ tab: last.toString() });
    return last;
  }
  return tab;
}
