import { redirect } from "react-router";
import { db } from "~/database";
import { DefaultError, err, integer, NotFound, ok, Result } from "~/lib/utils";
import { tx } from "~/transaction";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { generateId } from "~/lib/random";
import { Record } from "~/database/record/get-by-timestamp";
import { RecordProductFull } from "~/database/record-product/get-by-timestamp-full";

export async function toTransactionAction(formdata: FormData) {
  const parsed = integer.safeParse(formdata.get("timestamp"));
  if (!parsed.success) {
    return parsed.error.flatten().formErrors.join("; ");
  }
  const timestamp = parsed.data;
  const [errRecord, data] = await getRecord(timestamp);
  if (errRecord !== null) {
    return errRecord;
  }
  const { extras, products, record } = data;
  const [errTx, tab] = await tx.transaction.add({
    fix: record.fix,
    methodId: record.method.id,
    mode: record.mode,
    note: record.note,
  });
  if (errTx !== null) {
    return errTx;
  }
  const prodPromise = tx.product.addMany(
    products.map((p) => {
      const id = generateId();
      return {
        barcode: p.product?.barcode ?? "",
        id,
        discounts: p.discounts,
        name: p.product?.name ?? p.name,
        price: p.price,
        qty: p.qty,
        stock: p.product?.stock ?? p.qty,
        tab,
        product: p.product,
      };
    })
  );
  const extraPromise = tx.extra.addMany(
    extras.map((e) => {
      const id = generateId();
      return {
        id,
        kind: e.kind,
        name: e.name,
        saved: false,
        tab,
        value: e.value,
      };
    })
  );
  const [errMsg1, errMsg2] = await Promise.all([prodPromise, extraPromise]);
  if (errMsg1 !== null) return errMsg1;
  if (errMsg2 !== null) return errMsg2;
  throw redirect(`/?tab=${tab}`);
}

export type Data = {
  record: Record;
  products: RecordProductFull[];
  extras: RecordExtra[];
};

async function getRecord(timestamp: number): Promise<Result<DefaultError | NotFound, Data>> {
  const promises = Promise.all([
    db.record.get.byTimestamp(timestamp),
    db.recordProduct.get.byTimestampFull(timestamp),
    db.recordExtra.get.byTimestamp(timestamp),
  ]);
  const res = await promises;
  for (const [errMsg] of res) {
    if (errMsg) return err(errMsg);
  }
  const record = res[0][1]!;
  const products = res[1][1]!;
  const extras = res[2][1]!;
  return ok({
    record,
    products,
    extras,
  });
}
