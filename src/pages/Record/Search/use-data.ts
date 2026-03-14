import { Effect } from "effect";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "~/database";
import { tz } from "~/lib/constants";
import { Result } from "~/lib/result";
import { integer } from "~/lib/utils";

const KEY = "full-search";

export function useData() {
  const [search] = useSearchParams();
  const { start, end, query } = useMemo(() => {
    return getParams(search);
  }, [search]);
  const res = Result.use({
    fn: () => program(start, end, query),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
    deps: [start, end, query],
  });
  return res;
}

function program(start: number, end: number, query: string) {
  if (query.trim() === "") return Effect.succeed([]);
  return db.recordProduct.get.history(start, end, query);
}

function getParams(search: URLSearchParams): {
  start: number;
  end: number;
  query: string;
} {
  const today = Temporal.Now.zonedDateTimeISO().startOfDay();
  const lastMonth = today.subtract(Temporal.Duration.from({ months: 1 }));
  const start = integer.catch(lastMonth.epochMilliseconds).parse(search.get("start"));
  const endRaw = integer.catch(today.epochMilliseconds).parse(search.get("end"));
  const end = Temporal.Instant.fromEpochMilliseconds(endRaw)
    .toZonedDateTimeISO(tz)
    .add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
  const query = z.string().catch("").parse(search.get("query"));
  return { start, end, query };
}
