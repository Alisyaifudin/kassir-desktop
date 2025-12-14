import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { manualStore } from "../../../use-transaction";
import { NameInput } from "./NameInput";
import { ValueInput } from "./ValueInput";
import { KindSelect } from "./KindSelect";
import { SavedCheck } from "./SavedCheck";
import { extrasStore } from "~/pages/Shop/Right/Extra/use-extras";
import { produce } from "immer";
import { generateId } from "~/lib/random";
import { queue, retry } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { useTab } from "~/pages/shop/use-tab";

const store = manualStore.select("extra");

export function ExtraManual() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = generateId();
    const { value, name, kind, saved } = store.get();
    const [tab] = useTab();
    extrasStore.set(
      produce((draft) => {
        draft.push({
          id,
          tab,
          kind,
          saved,
          name,
          value,
        });
      }),
    );
    const errMsg = await retry(10, () =>
      tx.extra.add({
        tab,
        id,
        kind,
        saved,
        name,
        value,
      }),
    );
    if (errMsg !== null) {
      extrasStore.set((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    store.set({
      kind: "percent",
      name: "",
      saved: false,
      value: 0,
    });
    queue.add(() => tx.transaction.update.extra.clear(tab));
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 px-1">
      <NameInput />
      <Label htmlFor="extra-value">Nilai</Label>
      <div className="flex items-start gap-2">
        <ValueInput />
        <KindSelect />
      </div>
      <SavedCheck />
      <Button>Tambahkan</Button>
    </form>
  );
}
