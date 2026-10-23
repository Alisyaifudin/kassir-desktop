import { useMemo } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Loader, useStream } from "~/components/Loader";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { useUser } from "~/hooks/use-user";
import { getProductKind } from "~/lib/constants";
import { service } from "~/services";
import type { Product } from "~/services/product";
import { filterProducts } from "./use-filtered";
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
    <main className="relative flex h-[calc(100vh-68px)] flex-col overflow-hidden small:h-[calc(100vh-44px)]">
      <Loader res={res} fallback={<Loading view={state.view} />}>
        {({ data: products }) => <Content products={products} state={state} set={set} />}
      </Loader>
    </main>
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
  // Current list URL (`/products?stock=in&…`), so detail pages can come back to it.
  const urlBack = useGenerateUrlBack("/products");

  const availableKinds = useMemo(() => {
    const kinds = new Set<string>();
    for (const product of products) {
      // `kind` is a free label defaulting to ''; an unlabelled listing must not
      // add a blank checkbox to the filter.
      for (const listing of product.listings) {
        if (listing.kind !== "") kinds.add(listing.kind);
      }
    }
    // Sorted by display label, since the filter renders `getProductKind(kind)`.
    return [...kinds].sort((a, b) => getProductKind(a).localeCompare(getProductKind(b)));
  }, [products]);

  const filtered = useMemo(() => filterProducts(products, state), [products, state]);

  const totalPage = Math.max(1, Math.ceil(filtered.length / state.size));
  const page = Math.min(state.page, totalPage);
  const start = (page - 1) * state.size;
  const items = filtered.slice(start, start + state.size);

  return (
    <>
      <Toolbar
        state={state}
        set={set}
        availableKinds={availableKinds}
        total={filtered.length}
      />

      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-2 pt-2">
        {filtered.length === 0 ? (
          <Empty
            total={products.length}
            onReset={() => set({ q: "", kinds: [], stock: "all", margin: "all" })}
          />
        ) : state.view === "table" ? (
          <ProductTable items={items} start={start} urlBack={urlBack} />
        ) : (
          <ProductGrid items={items} urlBack={urlBack} />
        )}
      </div>

      <ListFooter page={page} size={state.size} total={filtered.length} set={set} />

      {role === "admin" ? (
        <Link
          to={{
            pathname: "/products/new",
            search: `url_back=${encodeURIComponent(urlBack)}`,
          }}
          className="absolute bottom-16 right-6 z-20"
        >
          <Button className="size-12 rounded-full shadow-lg" aria-label="Tambah produk">
            <Plus className="icon" />
          </Button>
        </Link>
      ) : null}
    </>
  );
}
