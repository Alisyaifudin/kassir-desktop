import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useTab } from "~/pages/shop/use-tab";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/shop/util-queue";
import { tx } from "~/transaction";

export function ValueInput() {
  const value = useAtom(manualStore, (state) => state.extra.valueStr);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: number) => {
    queue.add(tx.transaction.update.extra.value(tab, v));
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
        manualStore.set(
          produce((draft) => {
            draft.extra.value = num;
            draft.extra.valueStr = val;
          }),
        );
        save(num);
      }}
      name="value"
      aria-autocomplete="list"
    />
  );
}
