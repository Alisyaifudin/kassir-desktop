import Decimal from "decimal.js";
import { LoaderFunctionArgs, redirect } from "react-router";
import { db } from "~/database";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { Record } from "~/database/record/get-by-range";
import { Social } from "~/database/social/get-all";
import { DefaultError, err, integer, NotFound, ok, Result } from "~/lib/utils";
import { store } from "~/store";

export async function loader({ params }: LoaderFunctionArgs) {
  const parsed = integer.safeParse(params.timestamp);
  if (!parsed.success) {
    return redirect("/records");
  }
  const timestamp = parsed.data;
  const [errMsg, res] = await getData(timestamp);
  switch (errMsg) {
    case "Aplikasi bermasalah":
      throw new Error(errMsg);
    case "Tidak ditemukan":
      throw redirect("/records");
  }
  const products = db.product.get.all();
  const methods = db.method.getAll();
  return { data: res.data, info: res.info, methods, products };
}

export type Loader = typeof loader;

export type Data = {
  record: Record & {
    grandTotal: number;
    change: number;
  };
  products: RecordProduct[];
  extras: RecordExtra[];
};

async function getRecord(timestamp: number): Promise<Result<DefaultError | NotFound, Data>> {
  const promises = Promise.all([
    db.record.get.byTimestamp(timestamp),
    db.recordProduct.get.byTimestamp(timestamp),
    db.recordExtra.get.byTimestamp(timestamp),
  ]);
  const res = await promises;
  for (const [errMsg] of res) {
    if (errMsg) return err(errMsg);
  }
  const r = res[0][1]!;
  const products = res[1][1]!;
  const extras = res[2][1]!;
  const grandTotal = new Decimal(r.total).plus(r.rounding);
  const change = new Decimal(r.pay).minus(grandTotal);
  return ok({
    record: {
      ...r,
      subTotal: Number(r.subTotal.toFixed(r.fix)),
      total: Number(r.total.toFixed(r.fix)),
      grandTotal: Number(grandTotal.toFixed(r.fix)),
      change: Number(change.toFixed(r.fix)),
    },
    products,
    extras,
  });
}

async function getInfo() {
  const info = await store.info.get();
  return info;
}

async function getSocials() {
  return db.social.getAll();
}

export type Info = {
  address: string;
  footer: string;
  header: string;
  owner: string;
  showCashier: boolean;
  socials: Social[];
};

async function getData(timestamp: number): Promise<
  Result<
    DefaultError | NotFound,
    {
      data: Data;
      info: Info;
    }
  >
> {
  const res = await Promise.all([getRecord(timestamp), getInfo(), getSocials()]);
  for (const [errMsg] of res) {
    if (errMsg !== null) return err(errMsg);
  }
  const data = res[0][1]!;
  const info = res[1][1]!;
  const socials = res[2][1]!;
  return ok({
    data,
    info: {
      ...info,
      socials,
    },
  });
}
