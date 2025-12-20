import { LoaderFunctionArgs } from "react-router";
import { Temporal } from "temporal-polyfill";
import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams;
  const time = integer.catch(Date.now()).parse(search.get("time"));
  const [start, end] = getRange(time);
  const records = db.record.get.byRange(start, end);
  return { start, end, records };
}

export type Loader = typeof loader;

function getRange(time: number): [number, number] {
  const tz = Temporal.Now.timeZoneId();
  const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
  const day = t.dayOfWeek - 1;
  const days = t.daysInWeek;
  const start = t.subtract(Temporal.Duration.from({ days: day })).startOfDay();
  const end = start.add(Temporal.Duration.from({ days }));
  return [start.epochMilliseconds, end.epochMilliseconds];
}
