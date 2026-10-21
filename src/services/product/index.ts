import { Effect, Context, Data, Stream } from "effect";
import { NotFound } from "~/lib/effect-error";

export class ProductError extends Data.TaggedError("ProductError")<{ message: string }> {}

export class ProductDuplicateCode extends Data.TaggedError("ProductDuplicateCode")<{
  value: string;
}> {}

export type CodeKind = "barcode" | "qr";
export type Mime = "image/png" | "image/jpeg" | "image/webp";

export type Listing = {
  id: string;
  productId: string;
  name: string;
  price: number;
  unit: number;
  kind: string;
  code: string | null;
  codeKind: CodeKind | null;
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
};

export type Product = {
  id: string;
  name: string;
  note: string;
  /** Alternative names (`product_names`), used by search only. */
  altNames: string[];
  listings: Listing[];
  stock: number;
  capital: number;
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
  kind: string;
  code: string | null;
  codeKind: CodeKind | null;
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
};

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    get: {
      all: () => Effect.Effect<Product[], ProductError>;
      byId: (id: string) => Effect.Effect<ProductFull, ProductError | NotFound>;
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
