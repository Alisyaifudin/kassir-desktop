import { integer } from "~/lib/utils";

export function getTab(
  search: URLSearchParams,
  tabs: {
    tab: number;
    mode: TX.Mode;
  }[],
) {
  // already force to have at least one tab
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
