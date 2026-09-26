import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { cn } from "~/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DeleteSheet } from "./z-DeleteSheet";
import { useTabs } from "../../use-tabs";
import { useTab } from "../../use-tab";
import { useTransaction } from "./use-transaction";
import { useAdd } from "./use-new-tab";
import { NotFound } from "../../z-NotFound";

export function SheetTab() {
  const tabs = useTabs();
  const [selected, setTab] = useTab();
  const handleNew = useAdd();
  // TODO: should add useEffect on windows size changed, so add max-w accordingly
  // max-w-[830px]
  return (
    <div className="flex items-center flex-1 gap-1 bg-white px-0.5 pt-0.5 left-2 overflow-x-auto">
      <Button onClick={handleNew} className="p-1 rounded-full">
        <Plus className="icon" />
      </Button>
      <ForEach items={tabs}>
        {(tab) =>
          tab === selected ? (
            <Selected tab={tab} tabs={tabs} setTab={setTab} />
          ) : (
            <TabBtn tab={tab} tabs={tabs} setTab={setTab} />
          )
        }
      </ForEach>
      <Show when={tabs.find((t) => t === selected) === undefined}>
        <NotFound />
      </Show>
    </div>
  );
}

function TabBtn({
  setTab,
  tab,
  tabs,
  isSelected,
}: {
  tab: number;
  tabs: number[];
  setTab: (tab: number) => void;
  isSelected?: boolean;
}) {
  return (
    <div
      className={cn("rounded-b-0 rounded-t-md outline flex items-center gap-1", {
        "bg-black text-white": isSelected,
      })}
    >
      <button
        className="p-2"
        onClick={() => {
          setTab(tab);
        }}
      >
        {tab}
      </button>
      <Show when={tabs.length > 1}>
        <DeleteSheet tab={tab} />
      </Show>
    </div>
  );
}

function Selected({
  tab,
  setTab,
  tabs,
}: {
  tab: number;
  setTab: (tab: number) => void;
  tabs: [number, ...number[]];
}) {
  useTransaction(tabs, tab);
  return <TabBtn tab={tab} tabs={tabs} setTab={setTab} isSelected />;
}
