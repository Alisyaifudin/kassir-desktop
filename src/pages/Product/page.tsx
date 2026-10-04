import { useMemo } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Loader, useStream } from "~/components/Loader";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { Product } from "~/services/product";
import { filterProducts, needsAttention } from "./use-filtered";
import { useListState, type ListState, type ListStatePatch } from "./use-list-state";
import { Empty } from "./z-Empty";
import { ProductErrorBoundary, ProductErrorFallback } from "./z-Error";
import { Loading } from "./z-Loading";
import { ListFooter } from "./z-Pagination";
import { ProductGrid } from "./z-ProductGrid";
import { ProductTable } from "./z-ProductTable";
import { Toolbar } from "./z-Toolbar";

export default function Page() {
  return (
    <ProductErrorBoundary fallback={ProductErrorFallback}>
      <List />
    </ProductErrorBoundary>
  );
}

function List() {
  const res = useStream(service.product.get.changes);
  const { state, set } = useListState();

  return (
    <Loader res={res} fallback={<Loading view={state.view} />}>
      {({ data: products }) => <Content products={products} state={state} set={set} />}
    </Loader>
  );
}

function Content({
  products,
  state,
  set,
}: {
  products: Product[];
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  const role = useUser().role;

  const availableKinds = useMemo(() => {
    const kinds = new Set<string>();
    for (const product of products) {
      for (const listing of product.listings) kinds.add(listing.kind);
    }
    return [...kinds].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const attentionCount = useMemo(() => products.filter(needsAttention).length, [products]);
  const filtered = useMemo(() => filterProducts(products, state), [products, state]);

  const totalPage = Math.max(1, Math.ceil(filtered.length / state.size));
  const page = Math.min(state.page, totalPage);
  const start = (page - 1) * state.size;
  const items = filtered.slice(start, start + state.size);

  return (
    <main className="relative flex h-[calc(100vh-64px)] flex-col overflow-hidden small:h-[calc(100vh-48px)]">
      <Toolbar
        state={state}
        set={set}
        availableKinds={availableKinds}
        total={filtered.length}
        attentionCount={attentionCount}
      />

      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-2 pt-2">
        {filtered.length === 0 ? (
          <Empty
            onReset={() =>
              set({ q: "", kinds: [], stock: "all", margin: "all", attention: false })
            }
          />
        ) : state.view === "table" ? (
          <ProductTable items={items} start={start} />
        ) : (
          <ProductGrid items={items} />
        )}
      </div>

      <ListFooter page={page} size={state.size} total={filtered.length} set={set} />

      {role === "admin" ? (
        <Link to="/products/new" className="absolute bottom-16 right-6 z-20">
          <Button size="icon" className="size-12 rounded-full shadow-lg" aria-label="Tambah produk">
            <Plus className="size-5" />
          </Button>
        </Link>
      ) : null}
    </main>
  );
}
