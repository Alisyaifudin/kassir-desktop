import { createPageData } from "~/components/page-data";
import type { Info, InfoError } from "~/services/info";

/**
 * Pengaturan → Toko.
 *
 * One key, not five: `info.set` writes the shop's identity whole, so a field's
 * input, the checkbox beside it and the receipt header can never come from
 * different versions of the same object. (Contrast `pages/Home`, where the four
 * day reads are independent and get a key each.)
 */
type ShopData = {
  info: Info;
};

// Cached: every key here is a live stream, so a return visit paints last
// visit's answer (flagged `refetching`) and the first emission confirms it.
export const pageData = createPageData<ShopData, InfoError>("ShopPage", {
  cache: true,
});
