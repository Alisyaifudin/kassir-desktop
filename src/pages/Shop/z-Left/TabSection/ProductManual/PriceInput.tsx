import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { tx } from "~/transaction-effect";
import { Field } from "../z-Field";
import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { manualStore, useFix } from "~/pages/Shop/use-transaction";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

export function PriceInput() {
  const price = useAtom(manualStore, (state) => state.product.price);
  const [value, setValue] = useState(() => {
    if (price === 0) return "";
    return price.toString();
  });
  useEffect(() => {
    if (price === 0) {
      setValue("");
    }
  }, [price]);
  const [tab] = useTab();
  const fix = useFix();
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
          step={1 / Math.pow(10, fix)}
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            const v = e.currentTarget.value;
            const num = Number(v);
            if (isNaN(num) || num < 0) return;
            setValue(v);
            manualStore.set(
              produce((draft) => {
                draft.product.price = num;
              }),
            );
            save(num);
          }}
        />
      </div>
    </Field>
  );
}
