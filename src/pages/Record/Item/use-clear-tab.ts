import { Effect } from "effect";
import { useEffect } from "react";
import { toast } from "sonner";
import { log } from "~/lib/log";
import { extrasStore } from "~/pages/Shop/store/extra";
import { basicStore, customerStore, manualStore } from "~/pages/shop/use-transaction";
import { tx } from "~/transaction";

export function useClearTab(tab?: number) {
  useEffect(() => {
    if (tab === undefined) return;
    Effect.runPromise(program(tab));
  }, [tab]);
}

function program(tab: number) {
  return Effect.gen(function* () {
    yield* tx.transaction.delete(tab);
    clear();
    const tabs = yield* tx.transaction.get.all();
    if (tabs.length === 0) {
      yield* tx.transaction.add.new();
    }
  }).pipe(
    Effect.catchTag("TooMany", (e) => {
      log.error(e.msg);
      toast.error("Terlalu banyak tab");
      return Effect.void;
    }),
    Effect.catchTag("TxError", (e) => {
      log.error(e.e);
      toast.error(e.e.message);
      return Effect.void;
    }),
  );
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
  extrasStore.trigger.clear();
}
