import { Button } from "~/components/ui/button";
import { SheetTab } from "./SheetTab";
import { basicStore } from "../use-transaction";
import { queue } from "../utils/queue";
import { TabInfo } from "~/transaction/transaction/get-all";
import { tx } from "~/transaction";
import { useTab } from "../use-tab";
import { useAtom } from "@xstate/store/react";

export function Tab({ tabs }: { tabs: TabInfo[] }) {
  return (
    <div className="flex gap-2 items-end justify-between">
      <div className="flex items-center gap-1">
        <SheetTab tabs={tabs} />
      </div>
      <div className="pb-1">
        <ModeTab />
      </div>
    </div>
  );
}

function ModeTab() {
  const mode = useAtom(basicStore, (state) => state.mode);
  const [tab] = useTab();
  function click(mode: TX.Mode) {
    if (tab === undefined) return;
    basicStore.set((prev) => ({ ...prev, mode }));
    queue.add(() => tx.transaction.update.mode(tab, mode));
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
