import Decimal from "decimal.js";
import { useEffect } from "react";
import { logOld } from "~/lib/utils";
import { extrasStore } from "~/pages/Shop/store/extra";
import { productsStore } from "~/pages/shop/Right/Product/use-products";
import { subStore } from "~/pages/shop/Right/use-subtotal";
import { basicStore, customerStore, manualStore } from "~/pages/Shop/store/transaction";
import { tx } from "~/transaction";

export function useClearTab(tab: number | null) {
  useEffect(() => {
    if (tab === null) return;
    handleTab(tab).then((errMsg) => {
      clear();
      if (errMsg === null) return;
      logOld.error(errMsg);
    });
  }, []);
}

async function handleTab(tab: number) {
  const errMsg = await tx.transaction.del(tab);
  if (errMsg !== null) return errMsg;
  const [errTab, tabs] = await tx.transaction.get.all();
  if (errTab !== null) return errTab;
  if (tabs.length === 0) {
    const [errNew] = await tx.transaction.addNew();
    if (errNew !== null) return errNew;
  }
  return null;
}

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
    name: "",
    phone: "",
  });
  subStore.set(new Decimal(0));
  productsStore.trigger.clear();
  extrasStore.trigger.clear();
}
