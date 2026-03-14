import { useAtom } from "@xstate/store/react";
import { produce } from "immer";
import { useDebouncedCallback } from "use-debounce";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { useTab } from "~/pages/shop/use-tab";
import { manualStore } from "~/pages/Shop/use-transaction";
import { queue } from "~/pages/shop/util-queue";
import { tx } from "~/transaction-effect";

export function KindSelect() {
  const value = useAtom(manualStore, (state) => state.extra.kind);
  const [tab] = useTab();
  const save = useDebouncedCallback((v: TX.ValueKind) => {
    queue.add(tx.transaction.update.extra.kind(tab, v));
  }, DEBOUNCE_DELAY);
  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val !== "percent" && val !== "number") return;
        manualStore.set(
          produce((draft) => {
            draft.extra.kind = val;
          }),
        );
        save(val);
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="number">Angka</SelectItem>
          <SelectItem value="percent">Persen</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
