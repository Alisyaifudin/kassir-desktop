import { createPageData } from "~/components/page-data";
import type { Combo, ComboError } from "~/services/combo";
import type { Extra, ExtraError } from "~/services/extra";
import type { Listing, ListingError } from "~/services/listing";

type ComboData = {
  combos: Combo[];
  listings: Listing[];
  extras: Extra[];
};

export type ComboPageError = ComboError | ListingError | ExtraError;

export const pageData = createPageData<ComboData, ComboPageError>("ComboPage", {
  cache: true,
});
