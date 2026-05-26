import Decimal from "decimal.js";
import { db } from "~/database";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { Record } from "~/database/record/get-by-range";
import { Result } from "~/lib/result";
import { Effect } from "effect";

const KEY = "record-item";

export const recordMap = new Map<string, RecordData>();

export function useData(id: string) {
  const res = Result.use({
    fn: () => loadDetailRecord(id),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}

export type Loader = typeof loadDetailRecord;

export type RecordData = {
  record: Record & {
    grandTotal: number;
    change: number;
  };
  products: RecordProduct[];
  extras: RecordExtra[];
};

export function loadDetailRecord(id: string) {
  return Effect.gen(function* () {
    const cache = recordMap.get(id);
    if (cache !== undefined) return cache;
    const [r, products, extras] = yield* Effect.all(
      [
        db.record.get.byId(id),
        db.recordProduct.get.byRecordId(id),
        db.recordExtra.get.ByRecordId(id),
      ],
      { concurrency: "unbounded" },
    );
    const grandTotal = new Decimal(r.total).plus(r.rounding);
    const change = new Decimal(r.pay).minus(grandTotal);
    const data: RecordData = {
      record: {
        ...r,
        subtotal: Number(r.subtotal.toFixed(r.fix)),
        total: Number(r.total.toFixed(r.fix)),
        grandTotal: Number(grandTotal.toFixed(r.fix)),
        change: Number(change.toFixed(r.fix)),
      },
      products,
      extras,
    };
    recordMap.set(id, data);
    return data;
  });
}
