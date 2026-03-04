import { useTabs } from "./use-tab";
import { HeaderColumn } from "./z-HeaderColumn";
import { SheetTab } from "./z-SheetTab";
import { ModeTab } from "./z-ModeTab";

export function Header() {
  const tabs = useTabs();
  return (
    <div className="flex flex-col">
      <div className="flex gap-2 items-end justify-between">
        <div className="flex items-center gap-1">
          <SheetTab tabs={tabs} />
        </div>
        <div className="pb-1">
          <ModeTab />
        </div>
      </div>
      <HeaderColumn />
    </div>
  );
}
