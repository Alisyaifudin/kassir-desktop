import createFuzzySearch, { type FuzzySearcher } from "@nozbe/microfuzz";
import { useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import type { Listing, Product } from "~/services/product";

export type ListingChoice = {
  productId: string;
  productName: string;
  stock: number;
  listing: Listing;
};

/**
 * Search by product name, listing name, or the listing's barcode/QR code. A
 * record points at a listing (not a product), so every result is one precise,
 * sellable variant.
 */
export function useListingSearch(products: Product[]) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<ListingChoice[]>([]);

  const choices = useMemo(
    () =>
      products.flatMap((product) =>
        product.listings.map((listing) => ({
          productId: product.id,
          productName: product.name,
          stock: product.stock,
          listing,
        })),
      ),
    [products],
  );

  const search = useMemo<FuzzySearcher<ListingChoice>>(
    () =>
      createFuzzySearch(choices, {
        getText: (choice) => [choice.productName, choice.listing.name, choice.listing.code],
        strategy: "smart",
      }),
    [choices],
  );

  const debounced = useDebouncedCallback((value: string) => {
    const trimmed = value.trim();
    setShown(trimmed === "" ? [] : search(trimmed).map((result) => result.item));
  }, DEBOUNCE_DELAY);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.value;
    setQuery(next);
    debounced(next);
  }

  return { query, handleChange, shown } as const;
}
