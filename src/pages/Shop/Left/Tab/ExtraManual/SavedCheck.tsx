import { manualStore } from "~/pages/Shop/use-transaction";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Label } from "~/components/ui/label";
import { useTab } from "~/pages/shop/use-tab";
import { useAtom } from "@xstate/store/react";
import { produce } from "immer";

export function SavedCheck() {
  const value = useAtom(manualStore, (state) => state.extra.saved);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: boolean) => {
    if (tab === undefined) return;
    queue.add(() => tx.transaction.update.extra.saved(tab, v));
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
