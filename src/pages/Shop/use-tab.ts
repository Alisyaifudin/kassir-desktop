import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";
import { basicStore } from "./use-transaction";
import { TabInfo } from "~/transaction/transaction/get-all";
import { useAtom } from "@xstate/store/react";

export function useTab() {
  const [search, setSearch] = useSearchParams();
  const tabs = useAtom(basicStore, state => state.tabs);
  const tab = getTab(search, tabs);
  function setTab(tab: number) {
    setSearch({
      tab: tab.toString(),
    });
  }
  return [tab, setTab] as const;
}

function getTab(search: URLSearchParams, tabs: TabInfo[]) {
  const last = tabs[tabs.length - 1].tab;
  const parsed = integer.safeParse(search.get("tab"));
  if (!parsed.success) {
    return last;
  }
  const tab = parsed.data;
  if (tabs.find((t) => t.tab === tab) === undefined) {
    return last;
  }
  return tab;
}
