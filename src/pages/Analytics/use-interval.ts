import { useSearchParams } from "react-router";
import { z } from "zod";

export function useInterval(defaultDay: "week" | "day" | "month") {
  const [search, setSearch] = useSearchParams();
  let interval = z
    .enum(["week", "month", "year", "day"])
    .catch(defaultDay)
    .parse(search.get("interval"));
  const set = (interval: "day" | "week" | "month" | "year") => {
    const s = new URLSearchParams(window.location.search);
    s.set("interval", interval);
    s.set("limit", "100");
    setSearch(s);
  };
  return [interval, set] as const;
}
