import { ForEach } from "~/components/ForEach";
import { DeleteSheet } from "../DeleteSheet";
import { Show } from "~/components/Show";
import { cn } from "~/lib/utils";
import { useTab } from "../use-tab";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Form } from "react-router";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";
import { useEffect } from "react";
import { toast } from "sonner";
import { TabInfo } from "~/transaction/transaction/get-all";
import { basicStore } from "../use-transaction";
import { useAtom } from "@xstate/store/react";

const label = {
  sell: "J",
  buy: "B",
};

export function SheetTab({ tabs }: { tabs: TabInfo[] }) {
  const [selected, setTab] = useTab();
  const mode = useAtom(basicStore, (state) => state.mode);
  const error = useAction<Action>()("new");
  useEffect(() => {
    if (error === undefined) return;
    toast.error(error);
  }, [error]);
  // TODO: should add useEffect on windows size changed, so add max-w accordingly
  // max-w-[830px]
  return (
    <div className="flex items-center flex-1 gap-1 bg-white px-0.5 pt-0.5 left-2 overflow-x-auto">
      <Form method="POST">
        <input type="hidden" name="action" value="new"></input>
        <Button className="p-1 rounded-full">
          <Plus className="icon" />
        </Button>
      </Form>
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
