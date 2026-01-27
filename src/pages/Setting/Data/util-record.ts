import Decimal from "decimal.js";
import { Effect } from "effect";
import { z } from "zod";
import { db } from "~/database-effect";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { dateStringSchema, dateToEpoch } from "~/lib/date";
import { validate } from "~/lib/validate";

const dateRangeSchema = z.object({
  start: dateStringSchema,
  end: dateStringSchema,
});

export type RecordOk = {
  name: string;
  data: string;
};

export function program(formdata: FormData) {
  return Effect.gen(function* () {
    const raw = yield* validate(dateRangeSchema, {
      start: formdata.get("start"),
      end: formdata.get("end"),
    }).pipe(
      Effect.catchTag("ZodValError", ({ error }) => {
        return Effect.fail(error.flatten().formErrors.join("; "));
      }),
    );
    const start = dateToEpoch(raw.start);
    const end = dateToEpoch(raw.end);
    const name = `record_${start}_${end}.json`;
    const data = yield* getJson(start, end);
    return {
      data,
      name,
    };
  });
}

type Record = {
  timestamp: number;
  paidAt: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: "buy" | "sell";
  pay: number;
  note: string;
  method: {
    id: number;
    name?: string;
    kind: DB.MethodEnum;
  };
  fix: number;
  customer: {
    name: string;
    phone: string;
  };
  subTotal: number;
  total: number;
  grandTotal: number;
  products: RecordProduct[];
  extras: RecordExtra[];
};

function getJson(start: number, end: number) {
  return Effect.gen(function* () {
    const [rs, ps, es] = yield* Effect.all(
      [
        db.record.get.byRange(start, end),
        db.recordProduct.get.byRange(start, end),
        db.recordExtra.get.byRange(start, end),
      ],
      { concurrency: "unbounded" },
    );
    const records: Record[] = [];
    for (const r of rs) {
      const products = ps.filter((p) => p.timestamp === r.timestamp);
      const extras = es.filter((e) => e.timestamp === r.timestamp);
      const fix = r.fix;
      const grandTotal = new Decimal(r.total).plus(r.rounding).toFixed(fix);
      records.push({
        ...r,
        products,
        extras,
        grandTotal: Number(grandTotal),
      });
    }
    return JSON.stringify(records, null, 2);
  });
}
