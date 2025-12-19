import { Search } from "./Search";
import { Pagination } from "./Pagination";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "./use-interval";
import { auth } from "~/lib/auth";
import { Limit } from "./Limit";

export function ExtraPanel({ length }: { length: number }) {
  const { totalPage } = useInterval(length);
  const role = auth.user().role;
  return (
    <div className="flex items-center gap-10">
      <Search />
      <div className="flex items-center gap-2">
        <Pagination total={totalPage} />
        <Limit />
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
