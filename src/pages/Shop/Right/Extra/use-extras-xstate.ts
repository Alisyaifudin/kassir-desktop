import { use, useEffect, useState } from "react";
import { DefaultError, Result } from "~/lib/utils";
import Decimal from "decimal.js";
import { loadStore } from "../use-total";
import { Extra as ExtraTx } from "~/transaction/extra/get-by-tab";
import { createStore, createAtom } from "@xstate/store";

export type Extra = ExtraTx & {};
export const extrasStore = createStore({
  context: [] as Extra[],
  on: {
    add(context, event: Extra) {
      return [...context, event];
    },
    init(_context, event: Extra[]) {
      return event;
    },
  },
});
// export const extraStore = (id: string) => {
//   const extra = extrasStore.get();
//   const index = extra.findIndex((a) => a.id === id);
//   if (index === -1) return undefined;
//   try {
//     return extrasStore.select(index) as Store<Extra>;
//   } catch (error) {
//     return undefined;
//   }
// };

export function useInitExtras(promise: Promise<Result<DefaultError, ExtraTx[]>>) {
  const [errMsg, extras] = use(promise);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (extras === null) return;
    loadStore.select("extra").set(true);
    const arr: Extra[] = extras.map((extra) => ({
      id: extra.id,
      tab: extra.tab,
      name: extra.name,
      kind: extra.kind,
      value: extra.value,
      saved: Boolean(extra.saved),
      extraId: extra.extraId,
    }));
    extrasStore.trigger.init(arr);
    setLoading(false);
  }, [extras]);
  return [loading, errMsg] as const;
}
// export function useIds() {
//   const extras = useStoreValue(extrasStore);
//   return extras.map((a) => a.id);
// }

// export const totalExtra = store<undefined | Decimal>(undefined);

// export function useExtraTotal() {
//   const extras = useStoreValue(extrasStore);
//   if (extras.length === 0) return undefined;
//   const subtotal = extras[extras.length - 1].subtotal;
//   return subtotal?.toNumber();
// }
