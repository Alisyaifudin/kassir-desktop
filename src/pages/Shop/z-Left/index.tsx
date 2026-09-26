import { Summary } from "./Summary";
import { cn } from "~/lib/utils";
import { ProductManual } from "./ProductManual";

export function Left() {
  return (
    <aside className={cn("flex flex-col overflow-hidden justify-between w-full h-full border-r")}>
      <ProductManual />
      <Summary />
    </aside>
  );
}
