import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { DRAFTS, type Draft } from "../mock";

/**
 * The open purchase drafts. Each one is its own cart, so a restocker can leave
 * a half-finished trip to the market and start another; the number is the
 * draft's ordinal and the title is what it is for.
 */
export function Tabs() {
  return (
    <div className="flex flex-col border-b">
      <div className="flex items-end gap-2 px-0.5 pt-0.5">
        <Button className="p-1 rounded-full" title="Draft baru">
          <Plus className="icon" />
        </Button>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {DRAFTS.map((draft) => (
            <Tab key={draft.id} draft={draft} selected={draft.number === 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tab({ draft, selected }: { draft: Draft; selected: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-t-md border border-b-0 py-1 pl-3 pr-1.5 transition-colors",
        selected ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      <span className="max-w-[160px] truncate text-small font-medium select-none">
        {draft.title}
      </span>
      <span
        className={cn(
          "rounded-full px-1.5 text-small font-bold tabular-nums",
          selected ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        )}
      >
        {draft.number}
      </span>
      <Button
        variant="ghost"
        size="icon"
        title={`Tutup ${draft.title}`}
        className={cn(
          "size-6 rounded-full hover:bg-destructive hover:text-primary-foreground",
          selected ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        <X className="icon" />
      </Button>
    </div>
  );
}
