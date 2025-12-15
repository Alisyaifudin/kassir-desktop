import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useTab } from "~/pages/shop/use-tab";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";

export function ValueInput() {
  const val = useAtom(manualStore, (state) => state.extra.value);
  const [value, setValue] = useState(() => {
    if (val === 0) return "";
    return val.toString();
  });
  useEffect(() => {
    if (val === 0) {
      setValue("");
    }
  }, [val]);
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
        const kind = manualStore.get().extra.kind;
        if (isNaN(num)) return;
        if (kind === "percent") {
          if (num < -100) return;
          if (num > 100) return;
        }
        setValue(val);
        manualStore.set(
          produce((draft) => {
            draft.extra.value = num;
          }),
        );
        save(num);
      }}
      name="value"
      aria-autocomplete="list"
    />
  );
}
