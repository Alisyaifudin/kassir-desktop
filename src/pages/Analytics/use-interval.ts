import { useSearchParams } from "react-router";
import { z } from "zod";

export function useInterval(defaultDay: "week" | "day" | "month") {
  const [search, setSearch] = useSearchParams();
  const interval = z
    .enum(["week", "month", "year", "day"])
    .catch(defaultDay)
    .parse(search.get("interval"));
  const set = (interval: "day" | "week" | "month" | "year") => {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("interval", interval);
      s.set("limit", "100");
      return s;
    });
  };
  return [interval, set] as const;
}
