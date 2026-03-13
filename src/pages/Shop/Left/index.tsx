import { Summary } from "./Summary";
import { cn } from "~/lib/utils";
import { TabSection } from "./TabSection";

export function Left() {
  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden justify-between w-[35%] h-full",
        "min-w-[666px] small:min-w-[400px]",
      )}
    >
      <TabSection />
      <Summary />
    </aside>
  );
}
