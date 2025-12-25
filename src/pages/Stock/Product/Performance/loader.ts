import { LoaderFunctionArgs, redirect } from "react-router";
import { integer } from "~/lib/utils";
import { db } from "~/database";
import { z } from "zod";
import { Temporal } from "temporal-polyfill";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const parsed = integer.safeParse(params.id);
  if (!parsed.success) {
    throw redirect("/stock");
  }
  const id = parsed.data;
  const search = new URL(request.url).searchParams;
  const { timestamp, interval, mode } = getParams(search);
  let [start, end] = getRange(timestamp, interval);
  const [[errHis, histories], [errProd, product]] = await Promise.all([
    db.product.get.historyRange(id, start, end),
    db.product.get.byId(id),
  ]);
  if (errHis) {
    throw new Error(errHis);
  }
  if (errProd) {
    throw new Error(errProd);
  }
  if (interval === "all") {
    const times = histories.map((h) => h.timestamp);
    start = Math.min(...times);
    end = Math.max(...times);
  }
  return { histories, start, end, interval, mode, product };
}

export type Loader = typeof loader;

const intervalSchema = z.enum(["month", "year", "all"]);
const modeSchema = z.enum(["sell", "buy"]);

type Interval = z.infer<typeof intervalSchema>;

function getParams(search: URLSearchParams) {
  const interval = intervalSchema.catch("month").parse(search.get("interval"));
  const timestamp = integer.catch(Date.now()).parse(search.get("time"));
  const mode = modeSchema.catch("sell").parse(search.get("mode"));
  return { interval, timestamp, mode };
}

function getRange(timestamp: number, interval: Interval): [number, number] {
  const tz = Temporal.Now.timeZoneId();
  switch (interval) {
    case "all":
      return [0, 4099680000000]; // 2100 gmt
    case "month": {
      const t = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
      const start = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: t.year,
        month: t.month,
        day: 1,
      }).startOfDay();
      const end = start.add(Temporal.Duration.from({ months: 1 }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
    case "year": {
      const t = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
      const start = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: t.year,
        month: 1,
        day: 1,
      }).startOfDay();
      const end = start.add(Temporal.Duration.from({ years: 1 }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
  }
}
