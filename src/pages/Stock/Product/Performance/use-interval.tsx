import { useSearchParams } from "react-router";
import { z } from "zod";

const intervalSchema = z.enum(["month", "year", "all"]);

export type Interval = z.infer<typeof intervalSchema>;

export function useInterval() {
  const [search, setSearch] = useSearchParams();
  const interval = intervalSchema.catch("month").parse(search.get("interval"));
  function setInterval(interval: Interval) {
    const s = new URLSearchParams(window.location.search);
    s.set("interval", interval);
    setSearch(s);
  }
  return [interval, setInterval] as const;
}
