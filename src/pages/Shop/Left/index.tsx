import { Summary } from "./Summary";
import { cn } from "~/lib/utils";
import { css } from "../style.css";
import { useSize } from "~/hooks/use-size";
import { TabSection } from "./TabSection";

export function Left() {
  const size = useSize();
  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden justify-between w-[35%] h-full",
        css.right[size].minWidth,
      )}
    >
      <TabSection />
      <div style={{ flex: "0 0 auto" }}>
        <hr />
        <Summary />
      </div>
    </aside>
  );
}
