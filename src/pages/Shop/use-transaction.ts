import { store } from "@simplestack/store";
import { use, useEffect, useState } from "react";
import { Result } from "~/lib/utils";
import { Transaction } from "~/transaction/transaction/get-by-tab";

export const basicStore = store<{
  tabs: { tab: number; mode: TX.Mode }[];
  tab: number;
  fix: number;
  mode: TX.Mode;
  rounding: number;
  query: string;
  pay: number;
  methodId: number;
  note: string;
}>({
  tabs: [],
  tab: 0,
  fix: 0,
  mode: "sell",
  rounding: 0,
  query: "",
  pay: 0,
  methodId: 1000, //cash
  note: "",
});

export const customerStore = store({
  name: "",
  phone: "",
  isNew: false,
});

export const manualStore = store({
  product: {
    name: "",
    barcode: "",
    price: 0,
    stock: 0,
    qty: 0,
  },
  extra: {
    name: "",
    value: 0,
    kind: "percent" as "percent" | "number",
    saved: false,
  },
});

export function useInitTx(
  tabs: { tab: number; mode: TX.Mode }[],
  promise: Promise<Result<"Aplikasi bermasalah" | "Tidak ditemukan", Transaction>>,
) {
  const [loading, setLoading] = useState(true);
  const [error, transaction] = use(promise);
  useEffect(() => {
    if (transaction === null) return;
    const { customer, product, extra, ...basic } = transaction;
    basicStore.set({ ...basic, pay: 0, rounding: 0, tabs });
    customerStore.set(customer);
    const stock = Math.max(product.stock, product.qty);
    manualStore.set({
      product: { ...product, stock },
      extra,
    });
    setLoading(false);
  }, [transaction]);
  useEffect(() => {
    basicStore.select("tabs").set(tabs);
  }, [tabs]);

  return [error, loading] as const;
}
