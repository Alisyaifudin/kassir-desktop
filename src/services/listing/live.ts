import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { ListingError, ListingService, type CodeKind, type Listing, type Mime } from ".";
import { DatabaseService, type DbError } from "../db";

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

const SELECT_LISTINGS =
  "SELECT listing_id, product_id, listing_name, listing_price, listing_unit, listing_kind, listing_code, listing_code_kind FROM listings WHERE listing_deleted_at IS NULL";
const SELECT_STOCKS = "SELECT product_id, stock_value FROM stocks";
const SELECT_IMAGES =
  "SELECT product_id, image_order, image_name, image_mime FROM images WHERE image_deleted_at IS NULL";

function toError(error: DbError): ListingError {
  return new ListingError({ message: error.message });
}

/** Name or code contains the query. A real text index will replace this. */
function matching(listings: Listing[], query: string): Listing[] {
  const q = query.trim().toLowerCase();
  if (q === "") return listings;
  const hits = listings.filter(
    (listing) =>
      listing.name.toLowerCase().includes(q) ||
      (listing.code?.toLowerCase().includes(q) ?? false),
  );
  // An exactly-typed code is a scan, so it leads the results and is what Enter
  // picks.
  return hits.sort(
    (a, b) => Number(b.code?.toLowerCase() === q) - Number(a.code?.toLowerCase() === q),
  );
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
        const [listingRows, stockRows, imageRows] = yield* Effect.all([
          db.selectMany<ListingRow>(SELECT_LISTINGS),
          db.selectMany<StockRow>(SELECT_STOCKS),
          db.selectMany<ImageRow>(SELECT_IMAGES),
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
