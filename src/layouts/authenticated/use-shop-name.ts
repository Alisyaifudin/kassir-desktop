import { useStream } from "~/components/Loader";
import { service } from "~/services";

/** What the topbar calls a shop that has not named itself yet. */
export const FALLBACK_SHOP_NAME = "Toko";

/**
 * The shop's name as the topbar shows it.
 *
 * Setting > Toko writes it to `owner` — the same field the receipt prints across
 * the top of the paper — so the topbar's brand follows that one setting instead
 * of the hardcoded default. `info.name` is an older title-bar field with no
 * editor left, so it is deliberately not read here.
 *
 * Subscribing rather than reading once is the point: saving the name repaints the
 * topbar immediately, without a reload. While the store is still hydrating — and
 * if it ever fails — the shop is simply called "Toko".
 */
export function useShopName(): string {
  const res = useStream(service.info.changes);
  const owner = res.type === "success" ? res.data.owner.trim() : "";
  return owner === "" ? FALLBACK_SHOP_NAME : owner;
}
