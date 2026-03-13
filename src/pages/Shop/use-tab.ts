import { useSearchParams } from "react-router";

export function useTab() {
  const [search, setSearch] = useSearchParams();
  const tab = extractTab(search);
  function setTab(tab: number) {
    setSearch((old) => {
      const search = new URLSearchParams(old);
      search.set("tab", tab.toString());
      return search;
    });
  }
  return [tab, setTab] as const;
}

function extractTab(search: URLSearchParams) {
  const tab = search.get("tab");
  const num = Number(tab);
  if (isNaN(num) || !isFinite(num)) return undefined;
  return num;
}
