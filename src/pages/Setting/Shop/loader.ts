import { getSize } from "~/lib/store-old";
import { LoaderArgs } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function loader({ context }: LoaderArgs) {
  const { store } = getContext(context);
  const { address, footer, header, owner, showCashier, size } = await store.get();
  return {
    address,
    footer,
    header,
    owner,
    showCashier: showCashier === "true",
    size: getSize(size),
  };
}

export type Loader = typeof loader;
