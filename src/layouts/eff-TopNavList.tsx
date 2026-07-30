import { Show } from "~/components/Show";
import { topNavLink } from "./eff-TopNavLink";
import { Effect } from "effect";
import { UserService } from "~/services/user";

export const topNavList = Effect.gen(function* () {
  const userService = yield* UserService;
  const useUser = () => userService.useUser();
  const TopNavLink = yield* topNavLink;
  return function TopNavList() {
    const role = useUser().role;
    return (
      <div className="hidden md:flex items-end gap-1 h-full pt-2">
        <TopNavLink path="/shop" label="Toko" alt="alt+0" root />
        <TopNavLink path="/stock" label="Stok" alt="alt+1" />
        <TopNavLink path="/records" label="Riwayat" alt="alt+2" />
        <Show when={role === "admin"}>
          <TopNavLink path="/money" label="Uang" alt="alt+3" />
        </Show>
      </div>
    );
  };
});
