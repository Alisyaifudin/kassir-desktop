import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { tx } from "~/transaction";
import { Field } from "../z-Field";
import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { manualStore } from "~/pages/Shop/use-transaction";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

export function PriceInput() {
  const value = useAtom(manualStore, (state) => state.product.priceStr);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: number) => {
    if (tab === undefined) return;
    queue.add(tx.transaction.update.product.price(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Field label="Harga*">
      <div className="flex items-center gap-1">
        <p className="text-2xl">Rp</p>
        <Input
          type="number"
          required
          name="price"
          step="off"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            const v = e.currentTarget.value;
            const num = Number(v);
            if (isNaN(num) || num < 0) return;
            manualStore.set(
              produce((draft) => {
                draft.product.price = num;
                draft.product.priceStr = v;
              }),
            );
            save(num);
          }}
        />
      </div>
    </Field>
  );
}
