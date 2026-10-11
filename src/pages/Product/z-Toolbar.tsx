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
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
  availableKinds: string[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2 border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-big font-bold text-foreground">Produk</h1>
          <span className="text-small text-muted-foreground">{total} produk</span>
        </div>
        <ViewToggle view={state.view} onChange={(view) => set({ view })} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Search value={state.q} onChange={(q) => set({ q })} />
        <Filter state={state} set={set} availableKinds={availableKinds} />
        <Sort state={state} set={set} />
      </div>
    </div>
  );
}
