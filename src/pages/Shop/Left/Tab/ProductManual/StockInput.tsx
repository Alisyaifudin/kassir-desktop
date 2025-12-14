import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Field } from "../Field";
import { useTab } from "~/pages/shop/use-tab";

const store = manualStore.select("product").select("stock");

export function StockInput() {
  const [value, setValue] = useState(store.get() === 0 ? "" : store.get().toString());
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
          store.set(num);
          save(num);
        }}
      />
    </Field>
  );
}
