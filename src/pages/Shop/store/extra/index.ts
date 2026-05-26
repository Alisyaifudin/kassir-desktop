import Decimal from "decimal.js";
import { Extra as ExtraTx } from "~/transaction/extra/get-by-tab";
import { createAtom, createStore } from "@xstate/store";
import { produce, WritableDraft } from "immer";
import { useSelector } from "@xstate/store/react";
import { calcEff } from "./transform-extra";
import { useSubtotal } from "../product";

export type Extra = ExtraTx & {
  eff: number;
  base: number;
  subtotal: number;
};

export const extrasStore = createStore({
  context: [] as Extra[],
  on: {
    init(_context, event: { extras: Extra[] }) {
      return event.extras;
    },
    changeSubtotal(context, event: { subtotal: Decimal }) {
      if (context.length === 0) return context;
      return produce(context, (draft) => {
        let base = event.subtotal;
        for (const extra of draft) {
          const { eff, subtotal } = calcEff(base, extra.value, extra.kind);
          extra.eff = eff;
          extra.subtotal = subtotal.toNumber();
          extra.base = base.toNumber();
          base = subtotal;
        }
      });
    },
    add(context, event: { extra: ExtraTx; subtotal: Decimal }) {
      let base = event.subtotal;
      if (context.length > 0) {
        base = new Decimal(context[context.length - 1].subtotal);
      }
      const { subtotal, eff } = calcEff(base, event.extra.value, event.extra.kind);
      const extra: Extra = {
        ...event.extra,
        eff,
        subtotal: subtotal.toNumber(),
        base: base.toNumber(),
      };
      return [...context, extra];
    },
    clear() {
      return [];
    },
    update(context, event: { id: string; recipe: (draft: WritableDraft<Extra>) => void }) {
      return produce(context, (draft) => {
        const index = draft.findIndex((d) => d.id === event.id);
        if (index === -1) return;
        draft[index] = produce(draft[index], event.recipe);
        let base = new Decimal(draft[index].base);
        // recalculate the rest
        for (const extra of draft.slice(index)) {
          const { eff, subtotal } = calcEff(base, extra.value, extra.kind);
          extra.eff = eff;
          extra.subtotal = subtotal.toNumber();
          extra.base = base.toNumber();
          base = subtotal;
        }
      });
    },
    delete(context, event: { id: string }) {
      return context.filter((c) => c.id !== event.id);
    },
  },
});

export const totalExtra = createAtom([]);

// export function useInitExtras(tab: number) {
//   const subtotal = useSubtotal();
//   const [error, setError] = useState<null | string>(null);
//   useEffect(() => {
//     async function init(tab: number) {
//       const either = await pipe(tx.extra.getByTab(tab), Effect.either, Effect.runPromise);
//       Either.match(either, {
//         onLeft({ e }) {
//           log.error(JSON.stringify(e.stack));
//           setError(e.message);
//         },
//         onRight(res) {
//           setError(null);
//           extrasStore.trigger.init({ extras: transformExtra(subtotal, res) });
//         },
//       });
//     }
//     init(tab);
//   }, [tab]);

//   return error;
// }

export function useTotal() {
  const extras = useSelector(extrasStore, (state) => state.context);
  const subtotal = useSubtotal();
  return calcTotal(subtotal, extras);
}

export function calcTotal(subtotal: Decimal, extras: Extra[]) {
  if (extras.length === 0) return subtotal;
  const total = extras[extras.length - 1].subtotal;
  return new Decimal(total);
}
