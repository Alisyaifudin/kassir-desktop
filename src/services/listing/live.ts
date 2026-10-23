import { Effect, Layer, Stream } from "effect";
import { ListingError, ListingService, type Listing } from ".";
import { isPublished, ProductService, type Product } from "../product";
import { getListingIndex, searchListings } from "~/lib/search/listings";

/**
 * The POS catalogue is a **projection of `ProductService`**, not a second cache.
 *
 * `ProductService` already owns every row this view needs (listings, stocks,
 * images, product names) and is the one service every write path refreshes —
 * `product.set.*` and `record.refreshProducts()` after each commit. Keeping a
 * copy here meant the POS sold yesterday's price and pre-sale stock until the
 * user reloaded the whole window.
 *
 * Published only: a product withdrawn from the till carries
 * `PRODUCT_FLAG_UNPUBLISHED` and contributes no listing here, so Pos and Restock
 * both stop offering it — search, grid and barcode alike — while the product,
 * its stock and its history stay in `/products`.
 */
function toListings(products: Product[]): Listing[] {
  const listings: Listing[] = [];
  for (const product of products) {
    if (!isPublished(product)) continue;
    for (const listing of product.listings) {
      listings.push({
        id: listing.id,
        productId: product.id,
        name: listing.name,
        price: listing.price,
        unit: listing.unit,
        kind: listing.kind,
        code: listing.code,
        cover: product.cover === null ? null : { name: product.cover.name, mime: product.cover.mime },
        stock: product.stock,
        productName: product.name,
        altNames: product.altNames,
      });
    }
  }
  return listings;
}

/**
 * `toListings` returns the same array until the catalogue changes, so the id map
 * is built once per catalogue instead of once per keystroke.
 */
let lookup: { listings: Listing[]; byId: Map<string, Listing> } | null = null;

function listingById(listings: Listing[]): Map<string, Listing> {
  if (lookup !== null && lookup.listings === listings) return lookup.byId;
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
  lookup = { listings, byId };
  return byId;
}

/**
 * Relevance-ordered matches over the listing index: listing name, its code,
 * the parent product name, and the product's alternative names. An empty query
 * returns the whole catalogue.
 */
function matching(listings: Listing[], query: string): Listing[] {
  if (query.trim() === "") return listings;
  const byId = listingById(listings);
  const hits: Listing[] = [];
  for (const hit of searchListings(getListingIndex(listings), query)) {
    const listing = byId.get(hit.id);
    if (listing !== undefined) hits.push(listing);
  }
  return hits;
}

export const ListingLive = Layer.effect(
  ListingService,
  Effect.gen(function* () {
    const product = yield* ProductService;

    function all(): Effect.Effect<Listing[], ListingError> {
      return product.get.all().pipe(
        Effect.map(toListings),
        Effect.mapError((error) => new ListingError({ message: error.message })),
      );
    }

    return {
      get: {
        all,
        search: (query) =>
          all().pipe(Effect.map((listings) => matching(listings, query))),
        changes: product.get.changes.pipe(
          Stream.map(toListings),
          Stream.mapError((error) => new ListingError({ message: error.message })),
        ),
      },
    };
  }),
);
