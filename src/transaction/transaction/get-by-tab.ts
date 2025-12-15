import { DefaultError, err, NotFound, ok, Result, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

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
    isNew: boolean;
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

export async function byTab(tab: number): Promise<Result<DefaultError | NotFound, Transaction>> {
  const tx = await getTX();
  const [errMsg, res] = await tryResult({
    run: () => tx.select<TX.Transaction[]>("SELECT * FROM transactions WHERE tab = $1", [tab]),
  });
  if (errMsg !== null) return err(errMsg);
  if (res.length === 0) return err("Tidak ditemukan");
  const r = res[0];
  return ok({
    tab,
    mode: r.tx_mode,
    query: r.tx_query,
    fix: r.tx_fix,
    methodId: r.tx_method_id,
    note: r.tx_note,
    customer: {
      name: r.tx_customer_name,
      phone: r.tx_customer_phone,
      isNew: Boolean(r.tx_customer_is_new),
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
  });
}
