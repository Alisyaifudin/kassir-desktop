import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { cn } from "~/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DeleteSheet } from "./z-DeleteSheet";
import { useTabs } from "../../use-tabs";
import { useTab } from "../../use-tab";
import { TabInfo } from "~/transaction-effect/transaction/get-all";
import { useTransaction } from "./use-transaction";
import { useAdd } from "./use-new-tab";
import { NotFound } from "./z-NotFound";

const label = {
  sell: "J",
  buy: "B",
};

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
        {({ tab, mode }) =>
          tab === selected ? (
            <Selected mode={mode} tab={tab} tabs={tabs} setTab={setTab} />
          ) : (
            <TabBtn mode={mode} tab={tab} tabs={tabs} setTab={setTab} />
          )
        }
      </ForEach>
      <Show when={tabs.find((t) => t.tab === selected) === undefined}>
        <NotFound  />
      </Show>
    </div>
  );
}

function TabBtn({
  setTab,
  tab,
  mode,
  tabs,
  isSelected,
}: {
  tab: number;
  mode: DB.Mode;
  tabs: TabInfo[];
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
        {label[mode]}
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
  mode,
  tabs,
}: {
  tab: number;
  setTab: (tab: number) => void;
  mode: DB.Mode;
  tabs: [TabInfo, ...TabInfo[]];
}) {
  useTransaction(tabs, tab);
  return <TabBtn mode={mode} tab={tab} tabs={tabs} setTab={setTab} isSelected />;
}
