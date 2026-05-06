import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { tx } from "~/transaction";
import { Field } from "../z-Field";
import { produce } from "immer";
import { useAtom } from "@xstate/store/react";
import { manualStore } from "~/pages/Shop/use-transaction";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

export function QtyInput() {
  const value = useAtom(manualStore, (state) => state.product.qtyStr);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: number) => {
    queue.add(tx.transaction.update.product.qty(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Field label="Kuantitas*">
      <Input
        type="number"
        required
        name="qty"
        aria-autocomplete="list"
        value={value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          const num = Number(v);
          if (isNaN(num) || num < 0) return;
          manualStore.set(
            produce((draft) => {
              draft.product.qty = num;
              draft.product.qtyStr = v;
            }),
          );
          save(num);
        }}
      />
    </Field>
  );
}
