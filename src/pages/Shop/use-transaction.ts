import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Transaction } from "~/transaction/transaction/get-by-tab";
import { productsStore } from "./store/product";
import { extrasStore } from "./store/extra";
import { tx } from "~/transaction";
import { produce, immerable } from "immer";
import { queue } from "./util-queue";

class Numeric {
  [immerable] = true;
  num: number;
  private _str: string;
  constructor(
    init: string,
    private nonNegative: boolean = false,
  ) {
    const num = Number(init);
    if (isNaN(num) || !isFinite(num)) {
      this.num = 0;
      this._str = "";
    } else {
      this.num = num;
      this._str = init;
    }
  }
  set str(value: string) {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num > 1e9) return;
    if (this.nonNegative && num < 0) return;
    this._str = value;
    this.num = num;
  }
  get str() {
    return this._str;
  }
}

export const basicStore = createAtom<{
  fix: number;
  mode: TX.Mode;
  rounding: Numeric;
  query: string;
  pay: Numeric;
  methodId: string;
  note: string;
}>({
  fix: 0,
  rounding: new Numeric(""),
  pay: new Numeric("", true),
  mode: "sell",
  query: "",
  methodId: "1000", //cash
  note: "",
});

export const customerStore = createAtom<{ name: string; phone: string; id?: string }>({
  name: "",
  phone: "",
  id: undefined,
});

export const manualStore = createAtom({
  product: {
    name: "",
    barcode: "",
    price: 0,
    qty: 0,
  },
  extra: {
    name: "",
    value: 0,
    kind: "percent" as "percent" | "number",
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
    pay: new Numeric("", true),
    rounding: new Numeric(""),
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
    methodId: "1000",
    mode: "sell",
    note: "",
    query: "",
    pay: new Numeric("", true),
    rounding: new Numeric(""),
  });
  customerStore.set({ name: "", phone: "" });
  manualStore.set({
    product: {
      name: "",
      barcode: "",
      price: 0,
      qty: 0,
    },
    extra: {
      name: "",
      value: 0,
      kind: "percent" as "percent" | "number",
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

export function setRounding(val: string) {
  basicStore.set(
    produce((r) => {
      r.rounding.str = val;
    }),
  );
}

export function usePay() {
  const pay = useAtom(basicStore, (state) => state.pay);
  return { num: pay.num, str: pay.str };
}

export function setPay(val: string) {
  basicStore.set(
    produce((r) => {
      r.pay.str = val;
    }),
  );
}
