import { Temporal } from "temporal-polyfill";
import { useSearchParams } from "react-router";
import { db } from "~/database";
import { Record as RecordDB } from "~/database/record/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import Decimal from "decimal.js";
import { tz } from "~/lib/constants";
import { Result } from "~/lib/result";
import { Effect } from "effect";

const earliest = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 1900,
  month: 1,
  day: 1,
}).startOfDay().epochMilliseconds;
const furthest = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 2101,
  month: 1,
  day: 1,
}).startOfDay().epochMilliseconds;

const KEY = "records";

export function useRecords() {
  const [search] = useSearchParams();
  const time = getTime(search);
  const res = Result.use({
    fn: () => loader(time),
    key: KEY,
    revalidateOn: { unmount: true },
    deps: [time],
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}

function loader(timestamp: number) {
  return Effect.gen(function* () {
    const date = Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(tz);
    const start = date.startOfDay().epochMilliseconds;
    const end = date.startOfDay().add(Temporal.Duration.from({ days: 1 })).epochMilliseconds;
    const [recordsRaw, products, extras] = yield* Effect.all(
      [
        db.record.get.byRange(start, end),
        db.recordProduct.get.byRange(start, end),
        db.recordExtra.get.byRange(start, end),
      ],
      { concurrency: "unbounded" },
    );
    const records: DataRecord[] = recordsRaw.map((r) => {
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

    return records;
  });
}

export type Record = RecordDB & {
  grandTotal: number;
  change: number;
};

export type DataRecord = {
  record: Record;
  products: RecordProduct[];
  extras: RecordExtra[];
};

function getTime(search: URLSearchParams): number {
  const timeStr = search.get("time");
  const timeNum = Number(timeStr);
  if (timeStr === null || Number.isNaN(timeNum)) {
    return Date.now();
  }
  if (earliest > timeNum || furthest < timeNum) {
    return Date.now();
  }
  return timeNum;
}
