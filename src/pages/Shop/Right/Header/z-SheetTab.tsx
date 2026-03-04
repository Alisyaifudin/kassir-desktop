import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { cn, logOld } from "~/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";
import { TabInfo } from "~/transaction/transaction/get-all";
import { useAtom } from "@xstate/store/react";
import { useSubmit } from "~/hooks/use-submit";
import { Effect, pipe } from "effect";
import { tx } from "~/transaction-effect";
import { revalidate } from "~/hooks/use-micro";
import { useTab } from "./use-tab";
import { basicStore } from "../../use-transaction";
import { DeleteSheet } from "./z-DeleteSheet";

const label = {
  sell: "J",
  buy: "B",
};

export function SheetTab({ tabs }: { tabs: TabInfo[] }) {
  const [selected, setTab] = useTab();
  const mode = useAtom(basicStore, (state) => state.mode);
  const { handleSubmit, error } = useSubmit(
    () => program(),
    (tab) => {
      // revalidate(key.transaction);
      // revalidate(key.tabs);
      setTab(tab);
    },
  );
  useEffect(() => {
    if (error === null) return;
    switch (error._tag) {
      case "TooMany":
        toast.error(error.msg);
        break;
      case "TxError":
        logOld.error(JSON.stringify(error.e.stack));
        toast.error(error.e.message);
        break;
    }
  }, [error?._tag]);
  // TODO: should add useEffect on windows size changed, so add max-w accordingly
  // max-w-[830px]
  return (
    <div className="flex items-center flex-1 gap-1 bg-white px-0.5 pt-0.5 left-2 overflow-x-auto">
      <form onSubmit={handleSubmit}>
        <Button className="p-1 rounded-full">
          <Plus className="icon" />
        </Button>
      </form>
      <ForEach items={tabs}>
        {({ tab, mode: m }) => (
          <div
            className={cn("rounded-b-0 bg-zinc-100 rounded-t-md outline flex items-center gap-1", {
              "bg-black text-white": selected === tab,
            })}
          >
            <button
              className="p-2"
              onClick={() => {
                if (selected === tab) return;
                setTab(tab);
              }}
            >
              {label[selected === tab ? mode : m]}
              {tab}
            </button>
            <Show when={tabs.length > 1}>
              <DeleteSheet tab={tab} />
            </Show>
          </div>
        )}
      </ForEach>
    </div>
  );
}

function program() {
  return pipe(tx.transaction.add.new(), Effect.either, Effect.runPromise);
}
