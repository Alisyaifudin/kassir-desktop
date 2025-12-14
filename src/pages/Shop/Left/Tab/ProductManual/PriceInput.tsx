import { useStoreValue } from "@simplestack/store/react";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { basicStore, manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Field } from "../Field";
import { useTab } from "~/pages/shop/use-tab";

const store = manualStore.select("product").select("price");

export function PriceInput() {
  const [value, setValue] = useState(store.get() === 0 ? "" : store.get().toString());
  const [tab] = useTab();
  const fix = useStoreValue(basicStore.select("fix"));
  const save = useDebouncedCallback((v: number) => {
    queue.add(() => tx.transaction.update.product.price(tab, v));
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
            if (isNaN(num) || num <= 0) return;
            setValue(v);
            store.set(num);
            save(num);
          }}
        />
      </div>
    </Field>
  );
}
