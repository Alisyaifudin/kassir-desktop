import { Search } from "../z-Search";
import { Pagination } from "../z-Pagination";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "../use-interval";
import { Attention } from "./z-Attention";
import { Limit } from "../z-Limit";
import { useLength } from "./use-length";
import { useUser } from "~/hooks/use-user";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { Sort } from "./z-Sort";
import { useSortBy } from "./use-sort-by";
import { useSortDir } from "./use-sort-dir";

export function ProductPanel() {
  const urlBack = useGenerateUrlBack("/stock");
  const role = useUser().role;
  const length = useLength();
  const { totalPage } = useInterval(length);
  const [sortBy, setSortBy] = useSortBy();
  const [sortDir, setSortDir] = useSortDir();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Attention />
          <Sort sortBy={sortBy} setSortBy={setSortBy} sortDir={sortDir} setSortDir={setSortDir} />
        </div>
        <Search className="flex-1" />
        <div className="flex items-center gap-2">
          <Pagination total={totalPage} />
          <Limit />
          <Show when={role === "admin"}>
            <Link
              to={{
                pathname: "/stock/product/new",
                search: `url_back=${encodeURIComponent(urlBack)}`,
              }}
              className="outline hover:bg-accent rounded-xl pl-3 flex gap-2 items-center w-fit"
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
