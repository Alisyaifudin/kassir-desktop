import { TX } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";

export type Transaction = {
  tab: number;
  query: string;
  mode: TX.Mode;
  fix: number;
  methodId: number;
  note: string;
  customer: {
    name: string;
    phone: string;
    id?: number;
  };
  product: {
    barcode: string;
    name: string;
    price: number;
    stock: number;
    qty: number;
  };
  extra: {
    name: string;
    value: number;
    kind: TX.ValueKind;
    saved: boolean;
  };
};

export function byTab(tab: number) {
  return Effect.gen(function* () {
    const res = yield* TX.try((tx) =>
      tx.select<TX.Transaction[]>("SELECT * FROM transactions WHERE tab = $1", [tab]),
    );
    if (res.length === 0) return yield* Effect.fail(NotFound.new("Tab tidak ditemukan"));
    const r = res[0];
    const transaction: Transaction = {
      tab,
      mode: r.tx_mode,
      query: r.tx_query,
      fix: r.tx_fix,
      methodId: r.tx_method_id,
      note: r.tx_note,
      customer: {
        name: r.tx_customer_name,
        phone: r.tx_customer_phone,
        id: r.tx_customer_id ?? undefined,
      },
      extra: {
        kind: r.tx_extra_kind,
        name: r.tx_extra_name,
        saved: Boolean(r.tx_extra_is_saved),
        value: r.tx_extra_value,
      },
      product: {
        barcode: r.tx_product_barcode,
        name: r.tx_product_name,
        price: r.tx_product_price,
        qty: r.tx_product_qty,
        stock: r.tx_product_stock,
      },
    };
    return transaction;
  });
}
