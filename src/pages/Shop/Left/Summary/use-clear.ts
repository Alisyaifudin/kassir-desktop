import { tx } from "~/transaction";
import { basicStore, customerStore, manualStore } from "../../use-transaction";
import { queue } from "../../utils/queue";
import { productsStore } from "../../Right/Product/use-products";
import { extrasStore } from "../../Right/Extra/use-extras";
import { useTab } from "../../use-tab";

export function useClear() {
  const [tab] = useTab();
  function clear() {
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
      isNew: false,
      name: "",
      phone: "",
    });
    productsStore.set([]);
    extrasStore.set([]);
    queue.add(() => tx.clear(tab));
  }
  return clear;
}
