import { useMemo } from "react";
import { Link } from "~/services/route/react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { Combo } from "~/services/combo";
import type { Extra } from "~/services/extra";
import type { Listing } from "~/services/listing";
import { pageData } from "./data";
import { comboSources } from "./sources";
import { useListState, type ListState, type ListStatePatch } from "./use-list-state";
import { filterCombos } from "./use-filtered";
import { ComboGrid } from "./z-ComboGrid";
import { ComboTable } from "./z-ComboTable";
import { Empty } from "./z-Empty";
import { Loading } from "./z-Loading";
import { ListFooter } from "./z-Pagination";
import { Toolbar } from "./z-Toolbar";

export default function Page() {
  const sources = useMemo(() => comboSources(), []);

  return (
    <pageData.Provider sources={sources}>
      <List />
    </pageData.Provider>
  );
}

function List() {
  const { state, set } = useListState();

  return (
    <main className="relative flex h-[calc(100vh-52px)] flex-col overflow-hidden">
      <h1 className="sr-only">Combo</h1>
      <Toolbar state={state} set={set} />
      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-2 pt-2">
        <pageData.Gate
          keys={["combos", "listings", "extras"]}
          pulse={<Loading view={state.view} />}
        >
          {({ combos, listings, extras }) => (
            <Rows combos={combos} listings={listings} extras={extras} state={state} set={set} />
          )}
        </pageData.Gate>
      </div>
      <ListFooter state={state} set={set} />
      <Button
        asChild
        className="absolute bottom-16 right-6 z-20 size-12 rounded-full shadow-lg"
        aria-label="Buat combo"
        title="Combo baru"
      >
        <Link to="/combos/new" behavior="push">
          <Plus className="size-5" />
        </Link>
      </Button>
    </main>
  );
}

function Rows({
  combos,
  listings,
  extras,
  state,
  set,
}: {
  combos: Combo[];
  listings: Listing[];
  extras: Extra[];
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  const filtered = useMemo(
    () => filterCombos(combos, state, listings, extras),
    // The filter reads only these URL fields; paging and view mode do not affect it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [combos, listings, extras, state.q, state.status, state.contents, state.sort, state.dir],
  );
  const totalPage = Math.max(1, Math.ceil(filtered.length / state.size));
  const page = Math.min(state.page, totalPage);
  const start = (page - 1) * state.size;
  const visible = filtered.slice(start, start + state.size);

  if (filtered.length === 0) {
    return <Empty total={combos.length} onReset={() => set({ q: "", status: "all", contents: "all" })} />;
  }

  return state.view === "table" ? (
    <ComboTable items={visible} start={start} />
  ) : (
    <ComboGrid items={visible} />
  );
}
