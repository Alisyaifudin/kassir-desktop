import Decimal from "decimal.js";
import { db } from "~/database";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { Record } from "~/database/record/get-by-range";
import { Result } from "~/lib/result";
import { Effect } from "effect";

const KEY = "record-item";

export function useData(timestamp: number) {
  const res = Result.use({
    fn: () => loader(timestamp),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}

export type Loader = typeof loader;

export type RecordData = {
  record: Record & {
    grandTotal: number;
    change: number;
  };
  products: RecordProduct[];
  extras: RecordExtra[];
};

function loader(timestamp: number) {
  return Effect.gen(function* () {
    const [r, products, extras] = yield* Effect.all(
      [
        db.record.get.byTimestamp(timestamp),
        db.recordProduct.get.byTimestamp(timestamp),
        db.recordExtra.get.byTimestamp(timestamp),
      ],
      { concurrency: "unbounded" },
    );
    const grandTotal = new Decimal(r.total).plus(r.rounding);
    const change = new Decimal(r.pay).minus(grandTotal);
    const data: RecordData = {
      record: {
        ...r,
        subTotal: Number(r.subTotal.toFixed(r.fix)),
        total: Number(r.total.toFixed(r.fix)),
        grandTotal: Number(grandTotal.toFixed(r.fix)),
        change: Number(change.toFixed(r.fix)),
      },
      products,
      extras,
    };
    return data;
  });
}
