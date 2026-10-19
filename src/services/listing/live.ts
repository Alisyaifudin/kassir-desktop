import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { ListingError, ListingService, type CodeKind, type Listing, type Mime } from ".";
import { DatabaseService, type DbError } from "../db";
import { getListingIndex, searchListings } from "~/lib/search/listings";

type ListingRow = {
  listing_id: string;
  product_id: string;
  listing_name: string;
  listing_price: number;
  listing_unit: number;
  listing_kind: string;
  listing_code: string | null;
  listing_code_kind: CodeKind | null;
};

type StockRow = { product_id: string; stock_value: number };
type ImageRow = { product_id: string; image_order: number; image_name: string; image_mime: Mime };
type ProductRow = { product_id: string; product_name: string };
type ProductNameRow = { product_id: string; product_name_value: string };

const SELECT_LISTINGS =
  "SELECT listing_id, product_id, listing_name, listing_price, listing_unit, listing_kind, listing_code, listing_code_kind FROM listings WHERE listing_deleted_at IS NULL AND product_id IN (SELECT product_id FROM products WHERE product_deleted_at IS NULL)";
const SELECT_STOCKS = "SELECT product_id, stock_value FROM stocks";
const SELECT_IMAGES =
  "SELECT product_id, image_order, image_name, image_mime FROM images WHERE image_deleted_at IS NULL";
const SELECT_PRODUCTS = "SELECT product_id, product_name FROM products";
const SELECT_PRODUCT_NAMES =
  "SELECT product_id, product_name_value FROM product_names WHERE product_name_deleted_at IS NULL";

function toError(error: DbError): ListingError {
  return new ListingError({ message: error.message });
}

/**
 * Relevance-ordered matches over the listing index: listing name, its code,
 * the parent product name, and the product's alternative names. An empty query
 * returns the whole (name-sorted) catalogue.
 */
function matching(listings: Listing[], query: string): Listing[] {
  if (query.trim() === "") return listings;
  const byId = new Map(listings.map((listing) => [listing.id, listing]));
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
    const db = yield* DatabaseService;

    // Seeded empty so layer construction stays synchronous; first read hydrates.
    const ref = yield* SubscriptionRef.make<Listing[]>([]);
    let loaded = false;

    function load(): Effect.Effect<Listing[], ListingError> {
      return Effect.gen(function* () {
        const [listingRows, stockRows, imageRows, productRows, nameRows] = yield* Effect.all([
          db.selectMany<ListingRow>(SELECT_LISTINGS),
          db.selectMany<StockRow>(SELECT_STOCKS),
          db.selectMany<ImageRow>(SELECT_IMAGES),
          db.selectMany<ProductRow>(SELECT_PRODUCTS),
          db.selectMany<ProductNameRow>(SELECT_PRODUCT_NAMES),
        ]).pipe(Effect.mapError(toError));

        const stockByProduct = new Map<string, number>();
        for (const row of stockRows) {
          stockByProduct.set(
            row.product_id,
            (stockByProduct.get(row.product_id) ?? 0) + row.stock_value,
          );
        }

        // The cover is the product's lowest-ordered image.
        const coverByProduct = new Map<string, { name: string; mime: Mime; order: number }>();
        for (const row of imageRows) {
          const current = coverByProduct.get(row.product_id);
          if (current === undefined || row.image_order < current.order) {
            coverByProduct.set(row.product_id, {
              name: row.image_name,
              mime: row.image_mime,
              order: row.image_order,
            });
          }
        }

        const nameByProduct = new Map<string, string>();
        for (const row of productRows) nameByProduct.set(row.product_id, row.product_name);

        const altNamesByProduct = new Map<string, string[]>();
        for (const row of nameRows) {
          const names = altNamesByProduct.get(row.product_id);
          if (names === undefined) altNamesByProduct.set(row.product_id, [row.product_name_value]);
          else names.push(row.product_name_value);
        }

        return listingRows
          .map((row): Listing => {
            const cover = coverByProduct.get(row.product_id);
            return {
              id: row.listing_id,
              productId: row.product_id,
              name: row.listing_name,
              price: row.listing_price,
              unit: row.listing_unit,
              kind: row.listing_kind,
              code: row.listing_code,
              codeKind: row.listing_code_kind,
              cover: cover === undefined ? null : { name: cover.name, mime: cover.mime },
              stock: stockByProduct.get(row.product_id) ?? 0,
              productName: nameByProduct.get(row.product_id) ?? "",
              altNames: altNamesByProduct.get(row.product_id) ?? [],
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
      });
    }

    function hydrate(): Effect.Effect<void, ListingError> {
      return Effect.gen(function* () {
        const listings = yield* load();
        yield* SubscriptionRef.set(ref, listings);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, ListingError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(ref))),
        search: (query) =>
          ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(ref)),
            Effect.map((listings) => matching(listings, query)),
          ),
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(ref.changes))),
      },
    };
  }),
);
