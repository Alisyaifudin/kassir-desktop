import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { integer } from "~/lib/utils";

export function useRange() {
  const [search, setSearch] = useSearchParams();
  const today = Temporal.Now.zonedDateTimeISO().startOfDay();
  const lastMonth = today.subtract(Temporal.Duration.from({ months: 1 }));
  const start = integer.catch(lastMonth.epochMilliseconds).parse(search.get("start"));
  const end = integer.catch(today.epochMilliseconds).parse(search.get("end"));
  function setRange(start: number, end: number) {
    const s = new URLSearchParams(window.location.search);
    s.set("start", start.toString());
    s.set("end", end.toString());
    setSearch(s);
  }
  const range: [number, number] = [start, end];
  return [range, setRange] as const;
}
