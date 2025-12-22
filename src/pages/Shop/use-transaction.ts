import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { use, useEffect, useState } from "react";
import { Result } from "~/lib/utils";
import { Transaction } from "~/transaction/transaction/get-by-tab";

export const basicStore = createAtom<{
  fix: number;
  mode: TX.Mode;
  rounding: number;
  query: string;
  methodId: number;
  note: string;
}>({
  fix: 0,
  rounding: 0,
  mode: "sell",
  query: "",
  methodId: 1000, //cash
  note: "",
});

export const customerStore = createAtom<{ name: string; phone: string; id?: number }>({
  name: "",
  phone: "",
  id: undefined,
});

export const manualStore = createAtom({
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
  promise: Promise<Result<"Aplikasi bermasalah" | "Tidak ditemukan", Transaction>>
) {
  const [loading, setLoading] = useState(true);
  const [error, transaction] = use(promise);
  useEffect(() => {
    if (transaction === null) return;
    const { customer, product, extra, ...basic } = transaction;
    basicStore.set({ ...basic, rounding: 0 });
    customerStore.set(customer);
    const stock = Math.max(product.stock, product.qty);
    manualStore.set({
      product: { ...product, stock },
      extra,
    });
    setLoading(false);
  }, [transaction]);
  useEffect(() => {
    basicStore.set((prev) => ({ ...prev }));
  }, []);

  return [error, loading] as const;
}

export function useFix() {
  return useAtom(basicStore, (state) => state.fix);
}

export function useMode() {
  return useAtom(basicStore, (state) => state.mode);
}

export function useRounding() {
  return useAtom(basicStore, (state) => state.rounding);
}
