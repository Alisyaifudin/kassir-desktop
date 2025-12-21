import { data, LoaderFunctionArgs } from "react-router";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams;
  const { interval, time } = getParam(search);
  const [start, end] = getRange(interval, time);
  const items = db.product.get.byRange(start, end);
  return data(items);
}

export type Loader = typeof loader;

function getRange(interval: "week" | "month" | "day", time: number): [number, number] {
  const tz = Temporal.Now.timeZoneId();
  switch (interval) {
    case "week": {
      const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
      const day = t.dayOfWeek - 1;
      const days = t.daysInWeek;
      const start = t.subtract(Temporal.Duration.from({ days: day })).startOfDay();
      const end = start.add(Temporal.Duration.from({ days }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
    case "month": {
      const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
      const start = Temporal.ZonedDateTime.from({
        timeZone: tz,
        year: t.year,
        month: t.month,
        day: 1,
      }).startOfDay();
      const end = start.add(Temporal.Duration.from({ months: 1 }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
    case "day": {
      const start = Temporal.Instant.fromEpochMilliseconds(time)
        .toZonedDateTimeISO(tz)
        .startOfDay();
      const end = start.add(Temporal.Duration.from({ days: 1 }));
      return [start.epochMilliseconds, end.epochMilliseconds];
    }
  }
}

function getParam(search: URLSearchParams) {
  let interval = z.enum(["day", "week", "month"]).catch("day").parse(search.get("interval"));
  const time = integer.catch(Date.now()).parse(search.get("time"));
  return { interval, time };
}
