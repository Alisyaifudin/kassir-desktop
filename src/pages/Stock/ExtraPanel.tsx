import { useSearchParams } from "./use-search-params";
import { Search } from "./Search";
import { Pagination } from "./Pagination";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "./use-interval";
import { auth } from "~/lib/auth";

export function ExtraPanel({ length }: { length: number }) {
  const { set, get } = useSearchParams();
  const { totalPage } = useInterval(length);
  const role = auth.user().role;
  return (
    <div className="flex items-center gap-10">
      <Search query={get.query} setQuery={set.query} />
      <div className="flex items-center gap-2">
        <Pagination
          pagination={{ page: get.pageAdditional, total: totalPage }}
          setPage={set.pageAdditional}
        />
        <div className="relative">
          <span className="absolute -top-5 left-0 text-small z-10 px-1 bg-white">Batas</span>
          <select
            value={get.limit}
            className="w-fit text-normal outline"
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
            to="/stock/extra/new"
            className="hover:bg-accent outline rounded-xl flex gap-2 items-center pl-3 w-fit"
          >
            Tambah Biaya Lainnya
            <Button className="rounded-full p-1">
              <Plus />
            </Button>
          </Link>
        </Show>
      </div>
    </div>
  );
}
