import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";
import { basicStore } from "./use-transaction";
import { useStoreValue } from "@simplestack/store/react";
import { TabInfo } from "~/transaction/transaction/get-all";

export function useTab() {
  const [search, setSearch] = useSearchParams();
  const tabs = useStoreValue(basicStore.select("tabs"));
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
