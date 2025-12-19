import { Search } from "./Search";
import { Pagination } from "./Pagination";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "./use-interval";
import { auth } from "~/lib/auth";
import { Attention } from "./Attention";
import { Limit } from "./Limit";

export function ProductPanel({ productsLength }: { productsLength: number }) {
  const role = auth.user().role;
  const { totalPage } = useInterval(productsLength);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1">
        <Attention />
        <Search className="flex-1" />
        <div className="flex items-center gap-2">
          <Pagination total={totalPage} />
          <Limit />
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
