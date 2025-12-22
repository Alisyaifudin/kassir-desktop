import { useDebouncedCallback } from "use-debounce";
import { Input } from "~/components/ui/input";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { Field } from "../Field";
import { useTab } from "~/pages/shop/use-tab";
import { useAtom } from "@xstate/store/react";
import { produce } from "immer";

export function NameInput() {
  const value = useAtom(manualStore, (state) => state.product.name);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: string) => {
    if (tab === undefined) return;
    queue.add(() => tx.transaction.update.product.name(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Field label="Nama*">
      <Input
        type="text"
        required
        value={value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          manualStore.set(
            produce((draft) => {
              draft.product.name = v;
            }),
          );
          save(v);
        }}
        aria-autocomplete="list"
      />
    </Field>
  );
}
