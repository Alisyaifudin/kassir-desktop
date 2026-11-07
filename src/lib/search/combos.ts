import { norm } from "./normalize";
import type { Combo } from "~/services/combo";
import type { Listing } from "~/services/listing";

/** Searchable live catalog rows, keyed by listing id for component-name lookup. */
export function searchCombos(
  combos: readonly Combo[],
  query: string,
  listings: readonly Listing[],
  extraIds: ReadonlySet<string>,
): Combo[] {
  const needle = norm(query);
  if (needle === "") return [];
  const terms = needle.split(" ");
  const byId = new Map(listings.map((listing) => [listing.id, listing]));

  return combos.filter((combo) => {
    if (!combo.active || combo.components.length === 0) return false;
    if (!combo.components.every((component) => byId.has(component.listingId))) return false;
    if (!combo.extras.every((extra) => extraIds.has(extra.extraId))) return false;

    const componentNames = combo.components.flatMap((component) => {
      const listing = byId.get(component.listingId);
      return listing === undefined
        ? []
        : [listing.name, listing.productName, ...listing.altNames];
    });
    const haystack = norm([combo.name, ...componentNames].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}
