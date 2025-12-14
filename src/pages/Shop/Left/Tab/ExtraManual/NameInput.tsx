import { Input } from "~/components/ui/input";
import { Field } from "../Field";
import { manualStore } from "~/pages/Shop/use-transaction";
import { useStoreValue } from "@simplestack/store/react";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { queue } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { useTab } from "~/pages/shop/use-tab";

const store = manualStore.select("extra").select("name");

export function NameInput() {
  const value = useStoreValue(store);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: string) => {
    queue.add(() => tx.transaction.update.extra.name(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Field label="Nama">
      <Input
        type="text"
        name="name"
        value={value}
        onChange={(e) => {
          const v = e.currentTarget.value;
          store.set(v);
          save(v);
        }}
        aria-autocomplete="list"
      />
    </Field>
  );
}
