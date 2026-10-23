import { SkeletonText } from "~/components/ui/skeleton";
import type { ListState, ListStatePatch } from "./use-list-state";
import { Filter } from "./z-Filter";
import { Search } from "./z-Search";
import { Sort } from "./z-Sort";
import { ViewToggle } from "./z-ViewToggle";

/**
 * Every control here is static — search, filter, sort, view — so the toolbar
 * never waits. Only the count is data, and it pulses where it will land.
 */
export function Toolbar({
  state,
  set,
  availableKinds,
  total,
}: {
  state: ListState;
  set: (patch: ListStatePatch) => void;
  availableKinds: string[];
  /** `null` while the catalog is loading. */
  total: number | null;
}) {
  return (
    <div className="flex flex-col gap-2 border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="flex items-center gap-1 text-small text-muted-foreground">
            {total === null ? (
              <SkeletonText className="w-6" />
            ) : (
              <span className="tabular-nums">{total}</span>
            )}{" "}
            produk
          </span>
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
