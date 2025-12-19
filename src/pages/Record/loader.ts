import { DefaultError, err, ok, Result } from "~/lib/utils";
import { Temporal } from "temporal-polyfill";
import { LoaderFunctionArgs, redirect } from "react-router";
import { db } from "~/database";
import { Record as RecordDB } from "~/database/record/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import Decimal from "decimal.js";

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

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const time = getTime(url);
  if (
    earliest.epochMilliseconds > time.epochMilliseconds ||
    furthest.epochMilliseconds < time.epochMilliseconds
  ) {
    const now = Date.now();
    throw redirect("/records?time=" + now);
  }
  const methods = db.method.getAll();
  const records = getRecord(time.epochMilliseconds);
  return { records, methods };
}

export type Loader = typeof loader;

export type Record = RecordDB & {
  grandTotal: number;
  change: number;
};

export type Data = {
  record: Record;
  products: RecordProduct[];
  extras: RecordExtra[];
};

async function getRecord(timestamp: number): Promise<Result<DefaultError, Data[]>> {
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
  const start = date.startOfDay().epochMilliseconds;
  const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
  const promises = Promise.all([
    db.record.get.byRange(start, end),
    db.recordProduct.get.byRange(start, end),
    db.recordExtra.get.byRange(start, end),
  ]);
  const res = await promises;
  for (const [errMsg] of res) {
    if (errMsg) return err(errMsg);
  }
  const recordsRaw = res[0][1]!;
  const products = res[1][1]!;
  const extras = res[2][1]!;
  const records: Data[] = recordsRaw.map((r) => {
    const ps = products.filter((p) => p.timestamp === r.timestamp);
    const es = extras.filter((p) => p.timestamp === r.timestamp);
    const grandTotal = new Decimal(r.total).plus(r.rounding);
    const change = new Decimal(r.pay).minus(grandTotal);
    return {
      record: {
        ...r,
        subTotal: Number(r.subTotal.toFixed(r.fix)),
        total: Number(r.total.toFixed(r.fix)),
        grandTotal: Number(grandTotal.toFixed(r.fix)),
        change: Number(change.toFixed(r.fix)),
      },
      products: ps,
      extras: es,
    };
  });

  return ok(records);
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
