import { manualStore } from "~/pages/Shop/use-transaction";
import { useStoreValue } from "@simplestack/store/react";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Label } from "~/components/ui/label";
import { useTab } from "~/pages/shop/use-tab";

const store = manualStore.select("extra").select("saved");

export function SavedCheck() {
  const value = useStoreValue(store);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: boolean) => {
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
          store.set(checked);
          save(checked);
        }}
        className="icon"
      />
    </Label>
  );
}
