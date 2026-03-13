import { useLocation, useNavigate } from "react-router";
import { useTabs } from "./use-tabs";
import { RedirectError } from "./z-RedirectErrorBoundary";

export function useTab() {
  const { pathname } = useLocation();
  const tabs = useTabs();
  const paths = pathname.split("/");
  const navigate = useNavigate();
  if (!pathname.startsWith("/shop") || paths.length !== 3)
    throw new RedirectError(`/shop${tabs[tabs.length - 1].tab}`);
  const raw = paths[2];
  const tab = Number(raw);
  if (isNaN(tab) || !isFinite(tab)) throw new RedirectError(`/shop${tabs[tabs.length - 1].tab}`);

  function setTab(tab: number) {
    if (tabs.find((t) => t.tab === tab) === undefined) return;
    navigate(`/shop/${tab}`);
  }
  return [tab, setTab] as const;
}
