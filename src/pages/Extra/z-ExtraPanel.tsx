import { Search } from "./z-Search";
import { Show } from "~/components/Show";
import { Link } from "~/services/route/react";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useUser } from "~/hooks/use-user";

export function ExtraPanel() {
  const role = useUser().role;
  return (
    <div className="flex items-center gap-10">
      <Search />
      <div className="flex items-center gap-2">
        <Show when={role === "admin"}>
          <Link
            // A step: the form is opened from this list, and `Back` returns to it —
            // after saving too, because the form pops itself off.
            to="/extras/new"
            behavior="push"
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
