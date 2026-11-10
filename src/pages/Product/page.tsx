import { useMemo } from "react";
import { Link } from "~/services/route/react";
import { Plus } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useUser } from "~/hooks/use-user";
import { service } from "~/services";
import type { Product } from "~/services/product";
import type { Category } from "~/services/category";
import { pageData } from "./data";
import { filterProducts } from "./use-filtered";
import type { ListState, ListStatePatch } from "./use-list-state";
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
      <pageData.Provider
        sources={{ products: service.product.get.changes, categories: service.category.get.changes }}
      >
        <List />
      </pageData.Provider>
    </ProductErrorBoundary>
  );
}

/**
 * Only the rows wait. The toolbar, the pagination bar and the add button are
 * drawable before the catalog arrives — each of them reads what it needs for
 * itself, and the numbers inside them pulse in place.
 */
function List() {
  const { state, set } = useListState();
  const role = useUser().role;

  return (
    <main className="relative flex h-[calc(100vh-52px)] flex-col overflow-hidden">
      <Toolbar state={state} set={set} />

      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-2 pt-2">
        <pageData.Gate
          keys={["products", "categories"]}
          pulse={<Loading view={state.view} />}
          error={(error) => <TextError>{`Produk bermasalah: ${error.message}`}</TextError>}
        >
          {({ products, categories }) => (
            <Rows products={products} categories={categories} state={state} set={set} />
          )}
        </pageData.Gate>
      </div>

      <ListFooter state={state} set={set} />

      {role === "admin" ? (
        // A step: the form is opened from this list, and `Back` from it — or from
        // the product it creates — returns to the list on the filters it was left
        // on, because the stack keeps the whole URL, query included.
        <Link to="/products/new" behavior="push" className="absolute bottom-16 right-6 z-20">
          <Button className="size-12 rounded-full shadow-lg" aria-label="Tambah produk">
            <Plus className="size-5" />
          </Button>
        </Link>
      ) : null}
    </main>
  );
}

/**
 * The rows. Filtering and paging are a pure function of the catalog plus the URL
 * state, so they live here — in the component that renders them — and not in a
 * parent that would have to hold a `null` for "not loaded yet".
 *
 * They wait for the categories too, and that is the price of matching them: a
 * query is scored against category names, so a row drawn before they arrive would
 * answer a different question than the one on screen a frame later.
 */
function Rows({
  products,
  categories,
  state,
  set,
}: {
  products: Product[];
  categories: Category[];
  state: ListState;
  set: (patch: ListStatePatch) => void;
}) {
  // No pause here: the search bar already waits for it before it writes the URL,
  // so `state.q` arrives settled — a second `SEARCH_DELAY` would only make the
  // rows lag the bar by two pauses instead of one. The memo is keyed on what
  // filtering reads, not on `state`, which is a fresh object on every write.
  const kindsKey = state.kinds.join(",");
  const categoriesKey = state.categories.join(",");
  const filtered = useMemo(
    () => filterProducts(products, state, categories),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      products,
      categories,
      state.q,
      kindsKey,
      categoriesKey,
      state.stock,
      state.margin,
      state.publish,
      state.sort,
      state.dir,
    ],
  );
  const totalPage = Math.max(1, Math.ceil(filtered.length / state.size));
  const page = Math.min(state.page, totalPage);
  const start = (page - 1) * state.size;

  if (filtered.length === 0) {
    return (
      <Empty
        total={products.length}
        onReset={() =>
          set({ q: "", kinds: [], categories: [], stock: "all", margin: "all", publish: "all" })
        }
      />
    );
  }

  return state.view === "table" ? (
    <ProductTable items={filtered.slice(start, start + state.size)} start={start} />
  ) : (
    <ProductGrid items={filtered.slice(start, start + state.size)} />
  );
}
