import { useMemo } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Gate } from "~/components/page-data";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { useUser } from "~/hooks/use-user";
import { getProductKind } from "~/lib/constants";
import { service } from "~/services";
import { pageData } from "./data";
import { filterProducts } from "./use-filtered";
import { useListState } from "./use-list-state";
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
      <pageData.Provider sources={{ products: service.product.get.changes }}>
        <List />
      </pageData.Provider>
    </ProductErrorBoundary>
  );
}

/**
 * Only the rows wait. The toolbar, the pagination bar and the add button are
 * drawable before the catalog arrives — the count and the page range are the only
 * values in them, and those pulse in place.
 */
function List() {
  const res = pageData.use("products");
  const { state, set } = useListState();
  const role = useUser().role;
  // Current list URL (`/products?stock=in&…`), so detail pages can come back to it.
  const urlBack = useGenerateUrlBack("/products");

  const products = res.type === "success" ? res.data : null;

  const availableKinds = useMemo(() => {
    if (products === null) return [];
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

  const filtered = useMemo(
    () => (products === null ? null : filterProducts(products, state)),
    [products, state],
  );

  const total = filtered === null ? null : filtered.length;
  const totalPage = total === null ? 1 : Math.max(1, Math.ceil(total / state.size));
  const page = total === null ? 1 : Math.min(state.page, totalPage);
  const start = (page - 1) * state.size;

  return (
    <main className="relative flex h-[calc(100vh-68px)] flex-col overflow-hidden small:h-[calc(100vh-44px)]">
      <Toolbar state={state} set={set} availableKinds={availableKinds}  />

      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-2 pt-2">
        <Gate
          res={res}
          skeleton={<Loading view={state.view} />}
          error={(error) => <TextError>{`Produk bermasalah: ${error.message}`}</TextError>}
        >
          {() =>
            filtered === null ? null : filtered.length === 0 ? (
              <Empty
                total={products?.length ?? 0}
                onReset={() => set({ q: "", kinds: [], stock: "all", margin: "all" })}
              />
            ) : state.view === "table" ? (
              <ProductTable
                items={filtered.slice(start, start + state.size)}
                start={start}
                urlBack={urlBack}
              />
            ) : (
              <ProductGrid items={filtered.slice(start, start + state.size)} urlBack={urlBack} />
            )
          }
        </Gate>
      </div>

      <ListFooter page={page} size={state.size} total={total} set={set} />

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
    </main>
  );
}
