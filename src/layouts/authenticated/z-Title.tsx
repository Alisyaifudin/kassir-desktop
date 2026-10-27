import { Link } from "react-router";
import { useShopName } from "./use-shop-name";

/**
 * The shop's name, italicised beside the page title — the topbar's brand.
 *
 * It is the name from Setting > Toko (`info.owner`, the one the receipt prints),
 * not the old `info.name` field, so renaming the shop renames the brand without a
 * reload. The page title beside it stays the name of the screen.
 */
export function Title() {
  const shopName = useShopName();
  return (
    <div className="hidden lg:block ml-4 border-l pl-4 border-black/20 min-w-0">
      {/* A shop can call itself anything; the brand truncates rather than pushing
          the navigation off the topbar. */}
      <Link
        title={shopName}
        to="/"
        className="block truncate text-base font-medium italic opacity-80 pr-2"
      >
        {shopName}
      </Link>
    </div>
  );
}
