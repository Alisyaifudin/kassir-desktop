import { Link } from "~/services/route/react";
import { useShopName } from "./use-shop-name";

/**
 * The shop's name, italicised beside the page title — the topbar's brand.
 *
 * It is the name from Setting > Toko (`info.owner`, the one the receipt prints),
 * not the old `info.name` field, so renaming the shop renames the brand without a
 * reload. The page title beside it stays the name of the screen.
 *
 * It is also the way home, and home is not a step: the brand is the start of the
 * app, so it collapses the stack to `/` instead of pushing another `/` onto
 * whatever detour the operator was on. `Back` after it has nothing to return to,
 * which is the point — Beranda is where the app begins.
 */
export function Title() {
  const shopName = useShopName();
  return (
    <div className="hidden md:block ml-4 border-l pl-4 border-black/20 min-w-0">
      {/* A shop can call itself anything; the brand truncates rather than pushing
          the navigation off the topbar. */}
      <Link
        title={shopName}
        to="/"
        behavior="root"
        className="block truncate text-xl font-medium italic opacity-80 pr-2"
      >
        {shopName}
      </Link>
    </div>
  );
}
