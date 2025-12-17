import { useSearchParams } from "./use-search-params";
import { Search } from "./Search";
import { Pagination } from "./Pagination";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "./use-interval";
import { auth } from "~/lib/auth";

export function ProductPanel({ productsLength }: { productsLength: number }) {
  const { set, get } = useSearchParams();
  const role = auth.user().role;
  const { totalPage } = useInterval(productsLength);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1">
        {/* <Sort
          sortDir={get.sortDir}
          setSortDir={set.sortDir}
          sortBy={get.sortBy}
          setSortBy={set.sortBy}
        /> */}
        <Search className="flex-1" query={get.query} setQuery={set.query} />
        <div className="flex items-center gap-2">
          <Pagination
            pagination={{ page: get.pageProduct, total: totalPage }}
            setPage={set.pageProduct}
          />
          <div className="relative pt-3">
            <span className="absolute -top-2 left-0 text-small z-10 px-1 bg-white">Batas</span>
            <select
              value={get.limit}
              className="w-fit text-normal py-1 outline"
              onChange={(e) => set.limit(e.currentTarget.value)}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <Show when={role === "admin"}>
            <Link
              to="/stock/product/new"
              className="outline hover:bg-accent rounded-xl pl-3 flex gap-2 items-center  w-fit"
            >
              Tambah Produk
              <Button className="rounded-full p-1 cursor-pointer">
                <Plus />
              </Button>
            </Link>
          </Show>
        </div>
      </div>
    </div>
  );
}
