import { z } from "zod";
import { Database } from "~/database/old";
import {
  constructCSV,
  dateStringSchema,
  dateToEpoch,
  err,
  log,
  ok,
  Result,
  SubAction,
} from "~/lib/utils";
import { getContext } from "~/middleware/global";

const dateRangeSchema = z.object({
  start: dateStringSchema,
  end: dateStringSchema,
});

export type RecordOk = {
  name: string;
  record: string;
  item: string;
  additional: string;
  discount: string;
  start: number;
  end: number;
};

export async function recordAction({
  context,
  formdata,
}: SubAction): Promise<Result<string, RecordOk>> {
  const parsed = dateRangeSchema.safeParse({
    start: formdata.get("start"),
    end: formdata.get("end"),
  });
  if (!parsed.success) {
    return err(parsed.error.flatten().formErrors.join("; "));
  }
  const { db } = getContext(context);
  const start = dateToEpoch(parsed.data.start);
  const end = dateToEpoch(parsed.data.end);
  const [errMsg, res] = await getBlob(db, start, end);
  if (errMsg !== null) {
    return err(errMsg);
  }
  const name = `record_${start}_${end}.zip`;
  return ok({
    name,
    additional: res.additional,
    discount: res.discount,
    item: res.item,
    record: res.record,
    start,
    end,
  });
  // return new Response(blob, {
  // 	headers: {
  // 		"Content-Type": "application/zip",
  // 		"Content-Disposition": `attachment; filename="${name}"`, // This triggers the download
  // 	},
  // });
}

async function getBlob(
  db: Database,
  start: number,
  end: number,
): Promise<
  Result<
    string,
    {
      record: string;
      item: string;
      additional: string;
      discount: string;
    }
  >
> {
  const [[errRecords, records], [errItems, items], [errAdd, additionals], [errDisc, discounts]] =
    await Promise.all([
      db.record.get.byRange(start, end),
      db.recordItem.get.byRange(start, end),
      db.additional.get.byRange(start, end),
      db.discount.get.byRange(start, end),
    ]);
  if (errRecords !== null) {
    log.error(errRecords);
    return err(errRecords);
  }
  if (errAdd !== null) {
    log.error(errAdd);
    return err(errAdd);
  }
  if (errItems !== null) {
    log.error(errItems);
    return err(errItems);
  }
  if (errDisc !== null) {
    log.error(errDisc);
    return err(errDisc);
  }
  const recordCSV = constructCSV(records);
  const itemCSV = constructCSV(items);
  const additionalsCSV = constructCSV(additionals);
  const discountsCSV = constructCSV(discounts);

  // const zip = new JSZip();
  // zip.file(`records_${start}_${end}.csv`, recordCSV);
  // zip.file(`record_items_${start}_${end}.csv`, itemCSV);
  // zip.file(`additional_${start}_${end}.csv`, additionalsCSV);
  // zip.file(`discount_${start}_${end}.csv`, discountsCSV);

  // const blob = await zip.generateAsync({ type: "blob" });
  return ok({
    record: recordCSV,
    item: itemCSV,
    additional: additionalsCSV,
    discount: discountsCSV,
  });
}
