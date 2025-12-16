import Decimal from "decimal.js";
import { z } from "zod";
import { db } from "~/database";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { dateStringSchema, dateToEpoch, err, log, ok, Result } from "~/lib/utils";

const dateRangeSchema = z.object({
  start: dateStringSchema,
  end: dateStringSchema,
});

export type RecordOk = {
  name: string;
  data: string;
};

export async function recordAction(formdata: FormData): Promise<Result<string, RecordOk>> {
  const parsed = dateRangeSchema.safeParse({
    start: formdata.get("start"),
    end: formdata.get("end"),
  });
  if (!parsed.success) {
    return err(parsed.error.flatten().formErrors.join("; "));
  }
  const start = dateToEpoch(parsed.data.start);
  const end = dateToEpoch(parsed.data.end);
  const [errMsg, data] = await getJson(start, end);
  if (errMsg !== null) {
    return err(errMsg);
  }
  const name = `record_${start}_${end}.json`;
  return ok({
    data,
    name,
  });
  // return new Response(blob, {
  // 	headers: {
  // 		"Content-Type": "application/zip",
  // 		"Content-Disposition": `attachment; filename="${name}"`, // This triggers the download
  // 	},
  // });
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

async function getJson(start: number, end: number): Promise<Result<string, string>> {
  const [[errRecords, rs], [errProd, ps], [errExtra, es]] = await Promise.all([
    db.record.get.byRange(start, end),
    db.recordProduct.get.byRange(start, end),
    db.recordExtra.get.byRange(start, end),
  ]);
  if (errRecords !== null) {
    log.error(errRecords);
    return err(errRecords);
  }
  if (errExtra !== null) {
    log.error(errExtra);
    return err(errExtra);
  }
  if (errProd !== null) {
    log.error(errProd);
    return err(errProd);
  }
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
  return ok(JSON.stringify(records, null, 2));
  // const recordCSV = constructCSV(records);
  // const itemCSV = constructCSV(items);
  // const additionalsCSV = constructCSV(additionals);
  // const discountsCSV = constructCSV(discounts);

  // const zip = new JSZip();
  // zip.file(`records_${start}_${end}.csv`, recordCSV);
  // zip.file(`record_items_${start}_${end}.csv`, itemCSV);
  // zip.file(`additional_${start}_${end}.csv`, additionalsCSV);
  // zip.file(`discount_${start}_${end}.csv`, discountsCSV);

  // const blob = await zip.generateAsync({ type: "blob" });
  // return ok({
  //   record: recordCSV,
  //   item: itemCSV,
  //   additional: additionalsCSV,
  //   discount: discountsCSV,
  // });
}
