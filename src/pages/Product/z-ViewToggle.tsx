import { LayoutGrid, List } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { ViewMode } from "./use-list-state";

export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <div className="inline-flex h-[54px] items-center rounded-md border p-0.5 small:h-10">
      <Button
        type="button"
        variant="ghost"
        className={cn("h-full w-12 px-0 small:w-9", view === "grid" && "bg-muted")}
        onClick={() => onChange("grid")}
        aria-label="Tampilan grid"
      >
        <LayoutGrid className="icon" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn("h-full w-12 px-0 small:w-9", view === "table" && "bg-muted")}
        onClick={() => onChange("table")}
        aria-label="Tampilan tabel"
      >
        <List className="icon" />
      </Button>
    </div>
  );
}
