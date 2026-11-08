import { norm } from "~/lib/search/normalize";
import type { Combo } from "~/services/combo";
import type { Extra } from "~/services/extra";
import type { Listing } from "~/services/listing";
import type { ListState } from "./use-list-state";

function compare(a: Combo, b: Combo, sort: ListState["sort"]): number {
  switch (sort) {
    case "name":
      return a.name.localeCompare(b.name);
    case "updated":
      return a.updatedAt - b.updatedAt;
    case "listings":
      return a.components.length - b.components.length;
    case "extras":
      return a.extras.length - b.extras.length;
  }
}

export function filterCombos(
  combos: readonly Combo[],
  state: ListState,
  listings: readonly Listing[],
  extras: readonly Extra[],
): Combo[] {
  const query = norm(state.q);
  const terms = query === "" ? [] : query.split(" ");
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]));
  const extrasById = new Map(extras.map((extra) => [extra.id, extra]));

  const filtered = combos.filter((combo) => {
    if (state.status === "active" && !combo.active) return false;
    if (state.status === "inactive" && combo.active) return false;
    if (state.contents === "listings" && combo.components.length === 0) return false;
    if (state.contents === "extras" && combo.extras.length === 0) return false;

    if (terms.length === 0) return true;
    const componentNames = combo.components.flatMap(({ listingId }) => {
      const listing = listingsById.get(listingId);
      return listing === undefined ? [] : [listing.name, listing.productName, ...listing.altNames];
    });
    const extraNames = combo.extras.flatMap(({ extraId }) => {
      const extra = extrasById.get(extraId);
      return extra === undefined ? [] : [extra.name];
    });
    const haystack = norm([combo.name, ...componentNames, ...extraNames].join(" "));
    return terms.every((term) => haystack.includes(term));
  });

  const direction = state.dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    const primary = compare(a, b, state.sort) * direction;
    return primary || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}
