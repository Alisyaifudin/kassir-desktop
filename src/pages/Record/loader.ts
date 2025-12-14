import { DefaultError, err, LoaderArgs, ok, Result } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { Database } from "~/database/old";
import { redirect } from "react-router";
import { getContext } from "~/middleware/global";
import { getUser } from "~/middleware/authenticate";

const tz = Temporal.Now.timeZoneId();
const earliest = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 1900,
  month: 1,
  day: 1,
}).startOfDay();
const furthest = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 2101,
  month: 1,
  day: 1,
}).startOfDay();

export async function loader({ context, request }: LoaderArgs) {
  const url = new URL(request.url);
  const time = getTime(url);
  if (
    earliest.epochMilliseconds > time.epochMilliseconds ||
    furthest.epochMilliseconds < time.epochMilliseconds
  ) {
    const now = Date.now();
    throw redirect("/records?time=" + now);
  }
  const user = await getUser(context);
  const { store, db } = getContext(context);
  const [size, [errMsg, methods]] = await Promise.all([store.size(), db.method.get.all()]);
  if (errMsg) {
    throw new Error(errMsg);
  }
  const data = getRecord(db, time.epochMilliseconds);
  return { size, data, methods, role: user.role };
}

export type Loader = typeof loader;

export type Data = {
  records: DB.Record[];
  items: DB.RecordItem[];
  additionals: DB.Additional[];
  discounts: DB.Discount[];
};

async function getRecord(db: Database, timestamp: number): Promise<Result<DefaultError, Data>> {
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
  const start = date.startOfDay().epochMilliseconds;
  const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
  const promises = Promise.all([
    db.record.get.byRange(start, end),
    db.recordItem.get.byRange(start, end),
    db.additional.get.byRange(start, end),
    db.discount.get.byRange(start, end),
  ]);
  const res = await promises;
  for (const [errMsg] of res) {
    if (errMsg) return err(errMsg);
  }
  const records = res[0][1]!;
  const items = res[1][1]!;
  const additionals = res[2][1]!;
  const discounts = res[3][1]!;
  return ok({ records, items, additionals, discounts });
}

function getTime(url: URL): Temporal.ZonedDateTime {
  const tz = Temporal.Now.timeZoneId();
  const search = url.searchParams;
  const timeStr = search.get("time");
  if (timeStr === null || Number.isNaN(timeStr)) {
    const now = Temporal.Now.instant().toZonedDateTimeISO(tz);
    const search = new URLSearchParams(window.location.search);
    search.set("time", now.epochMilliseconds.toString());
    url.search = search.toString();
    throw redirect(url.href);
  }
  return Temporal.Instant.fromEpochMilliseconds(Number(timeStr)).toZonedDateTimeISO(tz);
}
