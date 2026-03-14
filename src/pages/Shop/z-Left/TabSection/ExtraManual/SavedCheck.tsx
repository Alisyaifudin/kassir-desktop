import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { tx } from "~/transaction";
import { Label } from "~/components/ui/label";
import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { manualStore } from "~/pages/Shop/use-transaction";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

export function SavedCheck() {
  const value = useAtom(manualStore, (state) => state.extra.saved);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: boolean) => {
    queue.add(tx.transaction.update.extra.saved(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Label className="flex items-center gap-3">
      <p>Simpan?</p>
      <input
        type="checkbox"
        name="saved"
        checked={value}
        onChange={(e) => {
          const checked = e.currentTarget.checked;
          manualStore.set(
            produce((draft) => {
              draft.extra.saved = checked;
            }),
          );
          save(checked);
        }}
        className="icon"
      />
    </Label>
  );
}
