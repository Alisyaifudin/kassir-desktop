import { Input } from "~/components/ui/input";
import { Field } from "../z-Field";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { tx } from "~/transaction";
import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { forwardRef } from "react";
import { manualStore } from "~/pages/Shop/use-transaction";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

// eslint-disable-next-line react/display-name
export const NameInput = forwardRef<HTMLInputElement>((_p, ref) => {
  const value = useAtom(manualStore, (state) => state.extra.name);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: string) => {
    queue.add(tx.transaction.update.extra.name(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Field label="Nama">
      <Input
        ref={ref}
        type="text"
        name="name"
        value={value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          manualStore.set(
            produce((draft) => {
              draft.extra.name = v;
            }),
          );
          save(v);
        }}
        aria-autocomplete="list"
      />
    </Field>
  );
});
