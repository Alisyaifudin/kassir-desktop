import type { ListState, ListStatePatch } from "./use-list-state";
import { Filter } from "./z-Filter";
import { Search } from "./z-Search";
import { Sort } from "./z-Sort";
import { ViewToggle } from "./z-ViewToggle";

export function Toolbar({
  state,
  set,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Search value={state.q} onChange={(q) => set({ q })} />
        <Filter state={state} set={set} />
        <Sort state={state} set={set} />
        <ViewToggle view={state.view} onChange={(view) => set({ view })} />
      </div>
    </div>
  );
}
