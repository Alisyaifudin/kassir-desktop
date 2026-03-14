import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTabs } from "../../use-tabs";

export function NotFound() {
  const tabs = useTabs();
  const navigate = useNavigate();
  useEffect(() => {
    const tab = tabs[tabs.length - 1].tab;
    navigate(`/shop/${tab}`);
  }, [tabs, navigate]);
  return null;
}

export default NotFound;
