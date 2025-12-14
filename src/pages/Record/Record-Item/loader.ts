import { redirect } from "react-router";
import { Database } from "~/database/old";
import { generateRecordSummary, Summary } from "~/lib/record";
import { Size, Store } from "~/lib/store-old";
import { DefaultError, err, integer, LoaderArgs, NotFound, ok, Result } from "~/lib/utils";
import { getUser } from "~/middleware/authenticate";
import { getContext } from "~/middleware/global";

export async function loader({ context, params }: LoaderArgs) {
  const parsed = integer.safeParse(params.timestamp);
  if (!parsed.success) {
    return redirect("/records");
  }
  const timestamp = parsed.data;
  const { db, store } = getContext(context);
  const [[errData, data], info, [errSocial, socials], [errMethod, methods]] = await getData(
    store,
    db,
    timestamp,
  );
  switch (errData) {
    case "Aplikasi bermasalah":
      throw new Error(errData);
    case "Tidak ditemukan":
      throw redirect("/records");
  }
  if (errSocial) {
    throw new Error(errSocial);
  }
  if (errMethod) {
    throw new Error(errMethod);
  }
  const user = await getUser(context);
  const products = db.product.get.all();
  return { info, data, socials, methods, role: user.role, products };
}

export type Loader = typeof loader;

// export type Data = {
// 	record: DB.Record;
// 	items: DB.RecordItem[];
// 	discounts: DB.Discount[];
// 	additionals: DB.Additional[];
// };

async function getRecord(
  db: Database,
  timestamp: number,
): Promise<Result<DefaultError | NotFound, Summary>> {
  const promises = await Promise.all([
    db.record.get.byTimestamp(timestamp),
    db.recordItem.get.byTimestamp(timestamp),
    db.discount.get.byTimestamp(timestamp),
    db.additional.get.byTimestamp(timestamp),
  ]);
  for (const [errMsg] of promises) {
    if (errMsg) return err(errMsg);
  }
  const record = promises[0][1]!;
  const items = promises[1][1]!;
  const discounts = promises[2][1]!;
  const additionals = promises[3][1]!;
  const summary = generateRecordSummary({ record, items, additionals, discounts });
  return ok(summary);
}

async function getInfo(store: Store) {
  const info = await store.get();
  let size: Size = "big";
  if (info.size === "small") {
    size = "small";
  }
  const showCashier = info.showCashier === "true";
  return { ...info, size, showCashier };
}

async function getSocials(db: Database) {
  return db.social.get.all();
}

async function getMethods(db: Database) {
  return db.method.get.all();
}

async function getData(store: Store, db: Database, timestamp: number) {
  return Promise.all([getRecord(db, timestamp), getInfo(store), getSocials(db), getMethods(db)]);
}
