import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Field } from "../Field";
import { useTab } from "~/pages/shop/use-tab";
import { produce } from "immer";
import { useAtom } from "@xstate/store/react";

export function StockInput() {
  const stock = useAtom(manualStore, (state) => state.product.stock);
  const [value, setValue] = useState(() => {
    const stock = manualStore.get().product.stock;
    if (stock === 0) return "";
    return stock.toString();
  });
  useEffect(() => {
    if (stock === 0) {
      setValue("");
    }
  }, [stock]);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: number) => {
    queue.add(() => tx.transaction.update.product.price(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Field label="Stok*">
      <Input
        type="number"
        required
        name="stock"
        aria-autocomplete="list"
        value={value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          const num = Number(v);
          if (isNaN(num) || num <= 0) return;
          setValue(v);
          manualStore.set(
            produce((draft) => {
              draft.product.stock = num;
            }),
          );
          save(num);
        }}
      />
    </Field>
  );
}
