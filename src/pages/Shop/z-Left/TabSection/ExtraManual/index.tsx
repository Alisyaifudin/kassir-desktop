import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { NameInput } from "./NameInput";
import { ValueInput } from "./ValueInput";
import { KindSelect } from "./KindSelect";
import { SavedCheck } from "./SavedCheck";
import { generateId } from "~/lib/random";
import { tx } from "~/transaction-effect";
import { extrasStore } from "~/pages/Shop/store/extra";
import { useRef } from "react";
import { manualStore } from "~/pages/Shop/use-transaction";
import { useSubtotal } from "~/pages/shop/store/product";
import { useTab } from "~/pages/shop/use-tab";
import { queue } from "~/pages/shop/util-queue";

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
    queue.add(
      tx.extra.add.one({
        tab,
        id,
        kind,
        saved,
        name,
        value,
      }),
    );
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
    queue.add(tx.transaction.update.extra.clear(tab));
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
