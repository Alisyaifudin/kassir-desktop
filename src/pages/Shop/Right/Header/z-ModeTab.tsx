import { Button } from "~/components/ui/button";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction-effect";
import { basicStore, useMode } from "../../use-transaction";
import { useTab } from "../../use-tab";
import { revalidateTabs } from "./use-tabs";
import { Effect } from "effect";

export function ModeTab() {
  const mode = useMode();
  const [tab] = useTab();
  function click(m: TX.Mode) {
    if (tab === undefined) return;
    if (mode === m) return;
    basicStore.set((prev) => ({ ...prev, mode: m }));
    queue.add(
      tx.transaction.update.mode(tab, m).pipe(
        Effect.tap(() => {
          revalidateTabs();
        }),
      ),
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        className={mode === "sell" ? "font-bold" : "text-black/50"}
        variant={mode === "sell" ? "default" : "ghost"}
        onClick={() => click("sell")}
        type="button"
      >
        Jual
      </Button>
      <Button
        className={mode === "buy" ? "font-bold" : "text-black/50"}
        variant={mode === "buy" ? "default" : "ghost"}
        onClick={() => click("buy")}
        type="button"
      >
        Beli
      </Button>
    </div>
  );
}
