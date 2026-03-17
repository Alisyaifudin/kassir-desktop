import { Search } from "../z-Search";
import { Pagination } from "../z-Pagination";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useInterval } from "../use-interval";
import { Limit } from "../z-Limit";
import { useLength } from "./use-length";
import { useUser } from "~/hooks/use-user";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";

export function ExtraPanel() {
  const length = useLength();
  const { totalPage } = useInterval(length);
  const role = useUser().role;
  const urlBack = useGenerateUrlBack("/stock");
  return (
    <div className="flex items-center gap-10">
      <Search />
      <div className="flex items-center gap-2">
        <Pagination total={totalPage} />
        <Limit />
        <Show when={role === "admin"}>
          <Link
            to={{ pathname: "/stock/extra/new", search: `url_back=${encodeURIComponent(urlBack)}` }}
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
