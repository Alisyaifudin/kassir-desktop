import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useTab } from "~/pages/shop/use-tab";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";

const store = manualStore.select("extra").select("value");

export function ValueInput() {
  const [value, setValue] = useState(store.get() === 0 ? "" : store.get().toString());
  const [tab] = useTab();
  const save = useDebouncedCallback((v: number) => {
    queue.add(() => tx.transaction.update.extra.value(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Input
      type="number"
      id="extra-value"
      value={value}
      onChange={(e) => {
        const val = e.currentTarget.value;
        const num = Number(val);
        const kind = manualStore.select("extra").select("kind").get();
        if (isNaN(num)) return;
        if (kind === "percent") {
          if (num < -100) return;
          if (num > 100) return;
        }
        setValue(val);
        store.set(num);
        save(num);
      }}
      name="value"
      aria-autocomplete="list"
    />
  );
}
