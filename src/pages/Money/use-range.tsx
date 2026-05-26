import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { integer } from "~/lib/utils";

const ONE_DAY = 86400000; // in ms

export function useRange() {
  const [search, setSearch] = useSearchParams();
  const today = Temporal.Now.zonedDateTimeISO().startOfDay();
  const lastMonth = today.subtract(Temporal.Duration.from({ months: 1 }));
  const start = integer.catch(lastMonth.epochMilliseconds).parse(search.get("start"));
  const endRaw = integer.safeParse(search.get("end"));
  let end = today.epochMilliseconds + ONE_DAY - 1;
  if (endRaw.success) {
    end = endRaw.data + ONE_DAY - 1;
  }
  function setRange(start: number, end: number) {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("start", start.toString());
      s.set("end", end.toString());
      return s;
    });
  }
  const range: [number, number] = [start, end];
  return [range, setRange] as const;
}
