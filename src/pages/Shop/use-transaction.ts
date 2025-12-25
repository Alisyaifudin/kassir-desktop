import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";

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

export function useFix() {
  return useAtom(basicStore, (state) => state.fix);
}

export function useMode() {
  return useAtom(basicStore, (state) => state.mode);
}

export function useRounding() {
  return useAtom(basicStore, (state) => state.rounding);
}
