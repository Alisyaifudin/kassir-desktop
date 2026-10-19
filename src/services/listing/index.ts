import { Effect, Context, Data, Stream } from "effect";

export class ListingError extends Data.TaggedError("ListingError")<{ message: string }> {}

export type CodeKind = "barcode" | "qr";
export type Mime = "image/png" | "image/jpeg" | "image/webp";

/**
 * A sellable listing with the bits of its parent product the search grid needs:
 * the cover image and the total stock. A product can have many listings, so the
 * grid is over listings, not products.
 */
export type Listing = {
  id: string;
  productId: string;
  name: string;
  price: number;
  /** How many pieces make one `price`. */
  unit: number;
  kind: string;
  code: string | null;
  codeKind: CodeKind | null;
  cover: { name: string; mime: Mime } | null;
  stock: number;
  /** Parent product's name, joined for search. */
  productName: string;
  /** Parent product's alternative names, joined for search. */
  altNames: string[];
};

export class ListingService extends Context.Tag("ListingService")<
  ListingService,
  {
    get: {
      all: () => Effect.Effect<Listing[], ListingError>;
      /** Name/code matches; a placeholder until a real text index exists. */
      search: (query: string) => Effect.Effect<Listing[], ListingError>;
      changes: Stream.Stream<Listing[], ListingError>;
    };
  }
>() {}
