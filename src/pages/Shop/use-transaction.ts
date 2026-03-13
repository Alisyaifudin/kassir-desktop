import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Transaction } from "~/transaction-effect/transaction/get-by-tab";
import { productsStore } from "./store/product";
import { extrasStore } from "./store/extra";
import { queue } from "./utils/queue";
import { tx } from "~/transaction-effect";

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

export function initStore({
  fix,
  methodId,
  mode,
  query,
  note,
  customer,
  extra,
  product,
}: Transaction) {
  basicStore.set({
    fix,
    methodId,
    mode,
    note,
    query,
    rounding: 0,
  });
  customerStore.set(customer);
  manualStore.set({
    extra,
    product,
  });
}

export function resetStore(tab: number) {
  basicStore.set({
    fix: 0,
    methodId: 1000,
    mode: "sell",
    note: "",
    query: "",
    rounding: 0,
  });
  customerStore.set({ name: "", phone: "" });
  manualStore.set({
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
  productsStore.trigger.clear();
  extrasStore.trigger.clear();
  queue.add(tx.clear(tab));
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
