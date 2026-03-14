import Decimal from "decimal.js";
import { db } from "~/database";
import { RecordExtra } from "~/database/record-extra/get-by-range";
import { RecordProduct } from "~/database/record-product/get-by-range";
import { Record } from "~/database/record/get-by-range";
import { Result } from "~/lib/result";
import { Effect } from "effect";

// export async function loader({ params, request }: LoaderFunctionArgs) {
//   const parsed = integer.safeParse(params.timestamp);
//   if (!parsed.success) {
//     return redirect("/records");
//   }
//   const timestamp = parsed.data;
//   const search = new URL(request.url).searchParams;
//   const fromTab = getSearchParams(search);
//   const [errMsg, res] = await getData(timestamp);
//   switch (errMsg) {
//     case "Aplikasi bermasalah":
//       throw new Error(errMsg);
//     case "Tidak ditemukan":
//       throw redirect("/records");
//   }
//   const products = db.product.get.all();
//   const methods = db.method.getAll();
//   return { fromTab, data: res.data, info: res.info, methods, products };
// }
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

export type Data = {
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
    const data: Data = {
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
