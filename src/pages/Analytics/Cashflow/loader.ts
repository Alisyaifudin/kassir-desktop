import { LoaderFunctionArgs } from "react-router";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "~/database";
import { integer } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const search = new URL(request.url).searchParams;
  const { interval, time } = getParam(search);
  const [start, end] = getRange(interval, time);
  const records = db.record.get.byRange(start, end);
  return { start, end, records };
}

export type Loader = typeof loader;

function getRange(interval: "week" | "month" | "year", time: number): [number, number] {
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
    case "year": {
      const t = Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(tz);
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

function getParam(search: URLSearchParams) {
  let interval = z.enum(["week", "month", "year"]).catch("month").parse(search.get("interval"));
  const time = integer.catch(Date.now()).parse(search.get("time"));
  return { interval, time };
}

// async function getRecords(
//   interval: "day" | "week" | "month" | "year",
//   start: number,
//   end: number
// ): Promise<Result<DefaultError, Record[]>> {
//   if (interval === "day") {
//     return ok([]);
//   }
//   const [errMsg, res] = await db.record.get.byRange(start, end);
//   if (errMsg !== null) return err(errMsg);
//   return ok(res);
// }

// function getInterval(search: URLSearchParams, tab: "crowd" | "cashflow" | "net" | "product") {
//   switch (tab) {
//     case "crowd":
//       return "week";
//     case "net":
//     case "cashflow":
//       let interval = "month";
//       if (parsed.success && parsed.data !== "day") {
//         interval = parsed.data;
//       }
//       return interval;
//     case "product":
//       return "day";
//   }
// }
