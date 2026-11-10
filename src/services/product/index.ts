import { Effect, Context, Data, Stream } from "effect";
import { NotFound } from "~/lib/effect-error";

export class ProductError extends Data.TaggedError("ProductError")<{ message: string }> {}

export class ProductDuplicateCode extends Data.TaggedError("ProductDuplicateCode")<{
  value: string;
}> {}

export type Mime = "image/png" | "image/jpeg" | "image/webp";

/**
 * `products.product_flag` bit 0: the product is withdrawn from the till.
 *
 * Set means the product and all of its listings are hidden from the Pos and
 * Restock catalogue (`ListingService`), while the row itself, its stock and its
 * history stay untouched — the /products list, reports and old records still
 * read it. Never reuse the bit; see `FLAGS.md`.
 */
export const PRODUCT_FLAG_UNPUBLISHED = 0b1;

/** False when the product is withdrawn from the till — see `PRODUCT_FLAG_UNPUBLISHED`. */
export function isPublished(product: { flag: number }): boolean {
  return (product.flag & PRODUCT_FLAG_UNPUBLISHED) === 0;
}

export type Listing = {
  id: string;
  productId: string;
  name: string;
  price: number;
  unit: number;
  /** Free label (`retail`, `karton`, …); `""` when the shop did not set one. */
  kind: string;
  /** The listing's one code (barcode, QR payload, SKU…); `null` for none. */
  code: string | null;
  updatedAt: number;
  syncAt: number | null;
};

export type Property = {
  id: string;
  productId: string;
  key: string;
  value: string;
  updatedAt: number;
  syncAt: number | null;
};

export type ProductName = {
  id: string;
  productId: string;
  value: string;
  updatedAt: number;
  syncAt: number | null;
};

export type ProductImage = {
  id: string;
  productId: string;
  order: number;
  name: string;
  mime: Mime;
  updatedAt: number;
  syncAt: number | null;
};

export type Stock = {
  id: string;
  productId: string;
  value: number;
  capital: number;
  createdAt: number;
  updatedAt: number;
};

export type ProductEvent = {
  id: string;
  createdAt: number;
  value: number;
  capital: number;
  note: string;
  productId: string;
  stockId: string | null;
  recordId: string | null;
  /**
   * The price the record line was sold at, when this movement came from one.
   *
   * Stock going *out* is a sale, and `capital` is the wrong figure to put beside
   * it — what the operator wants to see there is what it went for. `null` when no
   * record line points at the event (a manual stock-out): nothing was sold, so
   * there is no price to name and the note is the only honest label.
   */
  price: number | null;
};

export type Product = {
  id: string;
  name: string;
  note: string;
  /**
   * `product_flag` bitfield. 0 is a published product; bit 0 marks one that is
   * withdrawn from the till (`PRODUCT_FLAG_UNPUBLISHED`). Mask, never compare.
   */
  flag: number;
  /** Alternative names (`product_names`), used by search only. */
  altNames: string[];
  listings: Listing[];
  /**
   * The ids of the live categories this product is filed under, in link order.
   *
   * Ids only: the names come from `CategoryService`, which is its own read (the
   * picker needs the whole catalogue anyway, and a rename must reach every screen
   * without re-reading every product). A link whose category row this device has
   * not received yet is still listed here, so a save cannot silently drop it —
   * see `set.categories`.
   *
   * On the list as well as the detail: the products screen filters by category
   * and its search matches the names, and the read already loads every link.
   */
  categoryIds: string[];
  stock: number;
  capital: number;
  /**
   * The highest `capital` among the stock lots — per pcs, like `capital`, which
   * is their weighted average. What the card and the table show as `Modal`: "what
   * did this ever cost us" is decided by the dearest lot, not by the blend.
   *
   * Only lots that still hold stock count: a sold-out lot's capital is a past
   * purchase and would out-rank the lot the goods actually came from. When every
   * lot is empty (or negative), the highest of them is still the best answer
   * available. `0` when the product has no lots at all.
   *
   * Free to compute — the list read already loads every stock lot (see
   * `toProduct`).
   */
  maxCapital: number;
  cover: ProductImage | null;
  updatedAt: number;
  syncAt: number | null;
};

export type ProductFull = Product & {
  stocks: Stock[];
  properties: Property[];
  productNames: ProductName[];
  images: ProductImage[];
};

export type ProductSale = {
  recordId: string;
  listingId: string | null;
  name: string;
  kind: string;
  price: number;
  qty: number;
  capital: number;
  total: number;
  paidAt: number;
};

export type ProductPerformance = {
  sales: ProductSale[];
  stockOpening: number;
  stockEvents: ProductEvent[];
};

export type ListingInput = {
  name: string;
  price: number;
  unit: number;
  /** Free label; `""` is valid and means unlabelled. */
  kind: string;
  /** `null` when the listing has no code. Codes are unique across live listings. */
  code: string | null;
};

export type PropertyInput = { key: string; value: string };

export type ProductNameInput = { value: string };

export type ImageInput = { name: string; mime: Mime };

export type ProductInput = {
  name: string;
  note: string;
  listings: ListingInput[];
  stocks: { value: number; capital: number }[];
  properties: PropertyInput[];
  /**
   * The categories to file the product under, written with it in one transaction.
   *
   * Optional because the Settings → Data JSON import has no category ids to
   * carry (an import creates fresh rows, and another device's ids would mean
   * nothing here); an absent value means "no categories", not "leave as is".
   */
  categoryIds?: string[];
};

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    get: {
      all: () => Effect.Effect<Product[], ProductError>;
      byId: (id: string) => Effect.Effect<ProductFull, ProductError | NotFound>;
      /**
       * The product a listing belongs to. The cart line carries the listing it
       * sells from (and, for a line that was never restored from the catalogue,
       * only that), so the number cell's sheet asks by listing — when the sheet
       * opens, not while the cart is being filled.
       */
      byListing: (listingId: string) => Effect.Effect<ProductFull, ProductError | NotFound>;
      byCode: (value: string) => Effect.Effect<Product[], ProductError>;
      unsync: () => Effect.Effect<Product[], ProductError>;
      performance: (
        id: string,
        range: { from: number; to: number },
      ) => Effect.Effect<ProductPerformance, ProductError>;
      changes: Stream.Stream<Product[], ProductError>;
      changesFull: Stream.Stream<ProductFull[], ProductError>;
    };
    add: (input: ProductInput) => Effect.Effect<string, ProductError | ProductDuplicateCode>;
    set: {
      info: (id: string, info: { name: string; note: string }) => Effect.Effect<void, ProductError>;
      /**
       * Publishes the product back into the Pos / Restock catalogue, or withdraws
       * it. Only bit 0 of `product_flag` moves; every other bit is preserved.
       */
      publish: (id: string, published: boolean) => Effect.Effect<void, ProductError>;
      listing: {
        add: (
          productId: string,
          input: ListingInput,
        ) => Effect.Effect<string, ProductError | ProductDuplicateCode>;
        update: (
          productId: string,
          listingId: string,
          input: ListingInput,
        ) => Effect.Effect<void, ProductError | ProductDuplicateCode>;
        remove: (productId: string, listingId: string) => Effect.Effect<void, ProductError>;
      };
      property: {
        add: (productId: string, input: PropertyInput) => Effect.Effect<string, ProductError>;
        update: (
          productId: string,
          propertyId: string,
          input: PropertyInput,
        ) => Effect.Effect<void, ProductError>;
        remove: (productId: string, propertyId: string) => Effect.Effect<void, ProductError>;
      };
      productName: {
        add: (productId: string, input: ProductNameInput) => Effect.Effect<string, ProductError>;
        update: (
          productId: string,
          productNameId: string,
          input: ProductNameInput,
        ) => Effect.Effect<void, ProductError>;
        remove: (productId: string, productNameId: string) => Effect.Effect<void, ProductError>;
      };
      /**
       * Makes the product's live categories exactly `categoryIds` — one write that
       * adds the new links and soft-deletes the dropped ones, in one transaction.
       *
       * A link whose category is unknown to this device is preserved when it is
       * still in the list (a save from a screen that could not draw it must not
       * delete it), so callers pass the ids they mean, not a delta.
       */
      categories: (id: string, categoryIds: string[]) => Effect.Effect<void, ProductError>;
      image: {
        add: (productId: string, input: ImageInput) => Effect.Effect<string, ProductError>;
        /** Insert the drafts and renumber the gallery in one transaction. */
        commit: (
          productId: string,
          order: string[],
          drafts: { id: string; name: string; mime: Mime }[],
        ) => Effect.Effect<void, ProductError>;
        remove: (productId: string, imageId: string) => Effect.Effect<void, ProductError>;
        reorder: (productId: string, imageIds: string[]) => Effect.Effect<void, ProductError>;
      };
    };
    stock: {
      receive: (
        productId: string,
        input: { value: number; capital: number },
      ) => Effect.Effect<void, ProductError>;
      consume: (
        productId: string,
        input: { value: number; note?: string },
      ) => Effect.Effect<void, ProductError>;
      adjust: (
        productId: string,
        stockId: string,
        input: { value: number; capital: number; note?: string },
      ) => Effect.Effect<void, ProductError>;
      history: (
        productId: string,
        input: {
          /**
           * Keyset cursor: the full sort key of the last row seen, not just its
           * timestamp. One commit writes one event per lot stamped with the same
           * `now`, so a cursor on `created_at` alone drops the rest of a
           * same-instant group at a page boundary.
           */
          before?: { createdAt: number; id: string };
          /** Server-side Masuk/Keluar filter, so `done` means "no more matches". */
          mode?: "in" | "out";
          limit: number;
        },
      ) => Effect.Effect<ProductEvent[], ProductError>;
    };
    delete: (id: string) => Effect.Effect<void, ProductError>;
    /** Re-reads the whole catalogue. For imports, deletes and startup. */
    refresh: () => Effect.Effect<void, ProductError>;
    /**
     * Re-reads only these products and folds them into the aggregate. A record
     * commit moves the stock of the products on its lines and nothing else, so
     * this is what keeps `Bayar` O(lines) instead of O(catalogue).
     */
    refreshMany: (ids: string[]) => Effect.Effect<void, ProductError>;
  }
>() {}
