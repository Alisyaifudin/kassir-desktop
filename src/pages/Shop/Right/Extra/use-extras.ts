import { use, useEffect, useState } from "react";
import { DefaultError, Result } from "~/lib/utils";
import Decimal from "decimal.js";
import { loadStore } from "../use-total";
import { Extra as ExtraTx } from "~/transaction/extra/get-by-tab";
import { createAtom, createStore } from "@xstate/store";
import { produce, WritableDraft } from "immer";
import { useSubtotal } from "../use-subtotal";
import { useSelector } from "@xstate/store/react";

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
    calcEff(context, event: { subtotal: Decimal }) {
      return calcEffExtras(event.subtotal, context);
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
        for (let extra of draft.slice(index)) {
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

export function useInitExtras(promise: Promise<Result<DefaultError, ExtraTx[]>>) {
  const [errMsg, extras] = use(promise);
  const subtotal = useSubtotal();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (extras === null) return;
    loadStore.set((prev) => ({ ...prev, extra: true }));
    const arr: ExtraTx[] = extras.map((extra) => ({
      id: extra.id,
      tab: extra.tab,
      name: extra.name,
      kind: extra.kind,
      value: extra.value,
      saved: Boolean(extra.saved),
      extraId: extra.extraId,
    }));
    extrasStore.trigger.init({ extras: calcEffExtras(subtotal, arr) });
    setLoading(false);
  }, [extras]);

  return [loading, errMsg] as const;
}

export function useExtraTotal() {
  const extras = useSelector(extrasStore, (state) => state.context);
  if (extras.length === 0) return undefined;
  const subtotal = extras[extras.length - 1].subtotal;
  return subtotal;
}

function calcEff(
  base: Decimal,
  value: number,
  kind: TX.ValueKind,
): {
  eff: number;
  subtotal: Decimal;
} {
  let eff = value;
  if (kind === "percent") {
    eff = base.times(value).div(100).toNumber();
  }
  const subtotal = base.plus(eff);
  return {
    eff,
    subtotal,
  };
}

function calcEffExtras(subtotal: Decimal, extras: ExtraTx[]): Extra[] {
  let total = new Decimal(subtotal);
  const arr: Extra[] = [];
  for (const extra of extras) {
    const { subtotal, eff } = calcEff(total, extra.value, extra.kind);
    arr.push({
      ...extra,
      subtotal: subtotal.toNumber(),
      eff,
      base: total.toNumber(),
    });
    total = subtotal;
  }
  return arr;
}
