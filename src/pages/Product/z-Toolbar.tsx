import { AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { ListState, ListStatePatch } from "./use-list-state";
import { Filter } from "./z-Filter";
import { Search } from "./z-Search";
import { Sort } from "./z-Sort";
import { ViewToggle } from "./z-ViewToggle";

export function Toolbar({
  state,
  set,
  availableKinds,
  total,
  attentionCount,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
  availableKinds: string[];
  total: number;
  attentionCount: number;
}) {
  return (
    <div className="flex flex-col gap-2 border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-big font-bold text-foreground">Produk</h1>
          <span className="text-normal text-muted-foreground">{total} produk</span>
        </div>
        <div className="flex items-center gap-2">
          <AttentionToggle
            active={state.attention}
            count={attentionCount}
            onChange={(attention) => set({ attention })}
          />
          <ViewToggle view={state.view} onChange={(view) => set({ view })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Search value={state.q} onChange={(q) => set({ q })} />
        <Filter state={state} set={set} availableKinds={availableKinds} />
        <Sort state={state} set={set} />
      </div>
    </div>
  );
}

function AttentionToggle({
  active,
  count,
  onChange,
}: {
  active: boolean;
  count: number;
  onChange: (active: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className="gap-2"
      onClick={() => onChange(!active)}
    >
      <AlertTriangle className="size-4" />
      <span className="hidden sm:inline">Perhatian</span>
      {count > 0 ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs tabular-nums",
            active ? "bg-primary-foreground/20" : "bg-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </Button>
  );
}
