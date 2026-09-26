import { useLocation, useNavigate } from "react-router";
import { useTabs } from "./use-tabs";
import { RedirectError } from "./z-RedirectErrorBoundary";

export function useTab() {
  const { pathname } = useLocation();
  const tabs = useTabs();
  const paths = pathname.split("/");
  const navigate = useNavigate();
  function setTab(tab: number) {
    if (tabs.find((t) => t === tab) === undefined) return;
    navigate(`/shop/${tab}`, { replace: true });
  }
  if (!pathname.startsWith("/shop") || paths.length !== 3) {
    throw new RedirectError(`/shop/${tabs[tabs.length - 1]}`);
  }
  const raw = paths[2];
  const tab = Number(raw);
  if (isNaN(tab) || !isFinite(tab)) {
    console.log(tab, tabs);
    throw new RedirectError(`/shop/${tabs[tabs.length - 1]}`);
  }

  return [tab, setTab] as const;
}
