import { Summary } from "./Summary";
import { cn } from "~/lib/utils";
import { TabSection } from "./TabSection";

export function Left() {
  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden justify-between w-full h-full border-r",
      )}
    >
      <TabSection />
      <Summary />
    </aside>
  );
}
