import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useTab } from "~/pages/shop/use-tab";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";

export function KindSelect() {
  const value = useAtom(manualStore, (state) => state.extra.kind);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: TX.ValueKind) => {
    queue.add(() => tx.transaction.update.extra.kind(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <select
      onChange={(e) => {
        const val = e.currentTarget.value;
        if (val !== "percent" && val !== "number") return;
        manualStore.set(
          produce((draft) => {
            draft.extra.kind = val;
          }),
        );
        save(val);
      }}
      name="kind"
      value={value}
      className="w-fit outline"
    >
      <option value="number">Angka</option>
      <option value="percent">Persen</option>
    </select>
  );
}
