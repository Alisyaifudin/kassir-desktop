import { data, LoaderFunctionArgs } from "react-router";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams;
  const [start, end] = getRange(search);
  const mode = getMode(search);
  const items = db.product.get.performance(start, end, mode);
  return data(items);
}

export type Loader = typeof loader;

function getRange(search: URLSearchParams): [number, number] {
  const timestamp = getTime(search);
  const tz = Temporal.Now.timeZoneId();
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

function getTime(search: URLSearchParams): number {
  const parsed = integer.safeParse(search.get("time"));
  if (!parsed.success) {
    return Date.now();
  }
  return parsed.data;
}

function getMode(search: URLSearchParams): DB.Mode {
  const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
  if (!parsed.success) {
    return "sell";
  }
  return parsed.data;
}
