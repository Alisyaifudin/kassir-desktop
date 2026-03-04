import { tx } from "~/transaction-effect";
import { extrasStore } from "../../store/extra";
import { productsStore } from "../../store/product";
import { basicStore, customerStore, manualStore } from "../../use-transaction";
import { queue } from "../../utils/queue";

export function clear(tab: number) {
  basicStore.set((prev) => ({
    ...prev,
    fix: 0,
    methodId: 1000,
    note: "",
    pay: 0,
    rounding: 0,
    query: "",
  }));
  manualStore.set({
    extra: {
      kind: "percent",
      value: 0,
      name: "",
      saved: false,
    },
    product: {
      barcode: "",
      name: "",
      price: 0,
      qty: 0,
      stock: 0,
    },
  });
  customerStore.set({
    name: "",
    phone: "",
  });
  productsStore.trigger.clear();
  extrasStore.trigger.clear();
  queue.add(tx.clear(tab));
}
