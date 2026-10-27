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
    <div className="inline-flex h-9 items-center rounded-md border p-0.5">
      <Button
        type="button"
        variant="ghost"
        className={cn("h-full w-12 px-0", view === "grid" && "bg-muted")}
        onClick={() => onChange("grid")}
        aria-label="Tampilan grid"
      >
        <LayoutGrid className="size-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn("h-full w-12 px-0", view === "table" && "bg-muted")}
        onClick={() => onChange("table")}
        aria-label="Tampilan tabel"
      >
        <List className="size-5" />
      </Button>
    </div>
  );
}
