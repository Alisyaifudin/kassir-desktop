import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import z from "zod";

const dateStringSchema = z
  .string()
  .transform((v) => decodeURIComponent(v))
  .transform((v) => Temporal.PlainDate.from(v));

export function useRange() {
  const [search, setSearch] = useSearchParams();
  const startRaw = search.get("start");
  const endRaw = search.get("end");
  const range: [Temporal.PlainDate, Temporal.PlainDate] = useMemo(() => {
    const today = Temporal.Now.plainDateISO();
    const lastMonth = today.subtract(Temporal.Duration.from({ months: 1 }));
    const start = dateStringSchema.catch(lastMonth).parse(startRaw);
    let end = dateStringSchema.catch(today).parse(endRaw);
    if (Temporal.PlainDate.compare(end, start) < 0) end = start;
    return [start, end];
  }, [startRaw, endRaw]);
  function setRange(range: [Temporal.PlainDate, Temporal.PlainDate]) {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("start", range[0].toString());
      s.set("end", range[1].toString());
      return s;
    });
  }
  return [range, setRange] as const;
}