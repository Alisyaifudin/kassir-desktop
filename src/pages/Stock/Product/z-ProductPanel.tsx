import { Search } from "../z-Search";
import { Show } from "~/components/Show";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { Filter } from "./z-Filter";
import { Cashier } from "~/services/cashier";

type Props = {
  useUser: () => Cashier;
};

export function ProductPanel({ useUser }: Props) {
  const urlBack = useGenerateUrlBack("/stock");
  const role = useUser().role;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1">
        <Search className="flex-1" />
        <Filter />
        <div className="flex items-center gap-2">
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
