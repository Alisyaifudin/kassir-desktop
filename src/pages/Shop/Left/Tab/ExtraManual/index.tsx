import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { manualStore } from "../../../use-transaction";
import { NameInput } from "./NameInput";
import { ValueInput } from "./ValueInput";
import { KindSelect } from "./KindSelect";
import { SavedCheck } from "./SavedCheck";
import { generateId } from "~/lib/random";
import { queue, retry } from "~/pages/Shop/utils/queue";
import { tx } from "~/transaction";
import { useTab } from "~/pages/shop/use-tab";
import { extrasStore } from "~/pages/shop/Right/Extra/use-extras";
import { useSubtotal } from "~/pages/shop/Right/use-subtotal";
import { useRef } from "react";

export function ExtraManual() {
  const subtotal = useSubtotal();
  const [tab] = useTab();
  const ref = useRef<HTMLInputElement>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const id = generateId();
    const { value, name, kind, saved } = manualStore.get().extra;
    if (name.trim() === "" || value === 0) return;
    extrasStore.trigger.add({
      subtotal,
      extra: {
        id,
        tab,
        kind,
        saved,
        name,
        value,
      },
    });
    const errMsg = await retry(10, () =>
      tx.extra.add({
        tab,
        id,
        kind,
        saved,
        name,
        value,
      })
    );
    if (errMsg !== null) {
      extrasStore.trigger.delete({ id });
      return;
    }
    manualStore.set((prev) => ({
      ...prev,
      extra: {
        kind: "percent",
        name: "",
        saved: false,
        value: 0,
      },
    }));
    form.reset();
    ref.current?.focus();
    queue.add(() => tx.transaction.update.extra.clear(tab));
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 px-1">
      <NameInput ref={ref} />
      <Label htmlFor="extra-value">Nilai</Label>
      <div className="flex items-center gap-2 ">
        <ValueInput />
        <KindSelect />
      </div>
      <SavedCheck />
      <Button>Tambahkan</Button>
    </form>
  );
}
