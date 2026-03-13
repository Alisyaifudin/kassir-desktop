import { useEffect } from "react";
import { useNavigate } from "react-router";
import { TabInfo } from "~/transaction-effect/transaction/get-all";

export function NotFound({ tabs }: { tabs: [TabInfo, ...TabInfo[]] }) {
  const navigate = useNavigate();
  useEffect(() => {
    const tab = tabs[tabs.length - 1].tab;
    navigate(`/shop?tab=${tab}`);
  }, [tabs, navigate]);
  return null;
}
