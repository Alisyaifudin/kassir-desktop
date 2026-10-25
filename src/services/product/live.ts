import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import {
  PRODUCT_FLAG_UNPUBLISHED,
  ProductDuplicateCode,
  ProductError,
  ProductService,
  type ImageInput,
  type Listing,
  type ListingInput,
  type Mime,
  type Product,
  type ProductEvent,
  type ProductFull,
  type ProductImage,
  type ProductName,
  type ProductNameInput,
  type Property,
  type PropertyInput,
  type ProductSale,
  type Stock,
} from ".";
import { type DbError, type Statement, DatabaseService } from "../db";
import { NotFound } from "~/lib/effect-error";
import { generateId } from "~/lib/random";
import { validateProductInput } from "./validate-input";
import {
  adjustStatements,
  consumeStatements,
  receiveStatements,
  touchProduct,
  type StockLot,
} from "./stock-sql";

type ProductRow = {
  product_id: string;
  product_name: string;
  product_note: string;
  product_flag: number;
  product_updated_at: number;
  product_sync_at: number | null;
};

type ListingRow = {
  listing_id: string;
  product_id: string;
  listing_name: string;
  listing_price: number;
  listing_unit: number;
  listing_kind: string;
  listing_code: string | null;
  listing_updated_at: number;
  listing_sync_at: number | null;
};

type PropertyRow = {
  property_id: string;
  product_id: string;
  property_key: string;
  property_value: string;
  property_updated_at: number;
  property_sync_at: number | null;
};

type ProductNameRow = {
  product_name_id: string;
  product_id: string;
  product_name_value: string;
  product_name_updated_at: number;
  product_name_sync_at: number | null;
};

type ImageRow = {
  image_id: string;
  product_id: string;
  image_order: number;
  image_name: string;
  image_mime: Mime;
  image_updated_at: number;
  image_sync_at: number | null;
};

type StockRow = {
  stock_id: string;
  product_id: string;
  stock_value: number;
  stock_capital: number;
  stock_created_at: number;
  stock_updated_at: number;
};

type EventRow = {
  product_event_id: string;
  product_event_created_at: number;
  product_event_value: number;
  product_event_capital: number;
  product_event_note: string;
  product_id: string;
  stock_id: string | null;
  record_id: string | null;
};

type SaleRow = {
  record_id: string;
  listing_id: string | null;
  record_listing_name: string;
  record_listing_kind: string;
  record_listing_price: number;
  record_listing_qty: number;
  record_listing_capital: number;
  record_listing_total: number;
  record_paid_at: number;
};

type ProductState = {
  id: string;
  name: string;
  note: string;
  flag: number;
  updatedAt: number;
  syncAt: number | null;
  listings: Listing[];
  stocks: Stock[];
  properties: Property[];
  productNames: ProductName[];
  images: ProductImage[];
};

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.listing_id,
    productId: row.product_id,
    name: row.listing_name,
    price: row.listing_price,
    unit: row.listing_unit,
    kind: row.listing_kind,
    code: row.listing_code,
    updatedAt: row.listing_updated_at,
    syncAt: row.listing_sync_at,
  };
}

function rowToProperty(row: PropertyRow): Property {
  return {
    id: row.property_id,
    productId: row.product_id,
    key: row.property_key,
    value: row.property_value,
    updatedAt: row.property_updated_at,
    syncAt: row.property_sync_at,
  };
}

function rowToProductName(row: ProductNameRow): ProductName {
  return {
    id: row.product_name_id,
    productId: row.product_id,
    value: row.product_name_value,
    updatedAt: row.product_name_updated_at,
    syncAt: row.product_name_sync_at,
  };
}

function rowToImage(row: ImageRow): ProductImage {
  return {
    id: row.image_id,
    productId: row.product_id,
    order: row.image_order,
    name: row.image_name,
    mime: row.image_mime,
    updatedAt: row.image_updated_at,
    syncAt: row.image_sync_at,
  };
}

function rowToStock(row: StockRow): Stock {
  return {
    id: row.stock_id,
    productId: row.product_id,
    value: row.stock_value,
    capital: row.stock_capital,
    createdAt: row.stock_created_at,
    updatedAt: row.stock_updated_at,
  };
}

function rowToEvent(row: EventRow): ProductEvent {
  return {
    id: row.product_event_id,
    createdAt: row.product_event_created_at,
    value: row.product_event_value,
    capital: row.product_event_capital,
    note: row.product_event_note,
    productId: row.product_id,
    stockId: row.stock_id,
    recordId: row.record_id,
  };
}

function rowToSale(row: SaleRow): ProductSale {
  return {
    recordId: row.record_id,
    listingId: row.listing_id,
    name: row.record_listing_name,
    kind: row.record_listing_kind,
    price: row.record_listing_price,
    qty: row.record_listing_qty,
    capital: row.record_listing_capital,
    total: row.record_listing_total,
    paidAt: row.record_paid_at,
  };
}

function toProduct(state: ProductState): Product {
  let stock = 0;
  let capitalValue = 0;
  let maxCapital = 0;
  for (const lot of state.stocks) {
    stock += lot.value;
    capitalValue += lot.value * lot.capital;
    maxCapital = Math.max(maxCapital, lot.capital);
  }
  const cover = state.images.reduce<ProductImage | null>(
    (best, image) => (best === null || image.order < best.order ? image : best),
    null,
  );
  return {
    id: state.id,
    name: state.name,
    note: state.note,
    flag: state.flag,
    altNames: state.productNames.map((name) => name.value),
    listings: state.listings,
    stock,
    capital: stock > 0 ? capitalValue / stock : 0,
    maxCapital,
    cover,
    updatedAt: state.updatedAt,
    syncAt: state.syncAt,
  };
}

function toProductFull(state: ProductState): ProductFull {
  return {
    ...toProduct(state),
    stocks: state.stocks,
    properties: state.properties,
    productNames: state.productNames,
    images: [...state.images].sort((a, b) => a.order - b.order),
  };
}

function dbErrorToProductError(error: DbError): ProductError {
  return new ProductError({ message: error.message });
}

function codeErrorToProductError(
  error: DbError,
  code: string | null,
): ProductError | ProductDuplicateCode {
  // `DbError.message` is the cashier-facing sentence; the driver text (where
  // SQLite names the failed constraint) lives in `detail`. Both are checked so
  // this still works against a layer that folds them together.
  const driver = `${error.message} ${error.detail}`;
  if (code !== null && /UNIQUE constraint failed/i.test(driver) && /listing_code/i.test(driver)) {
    return new ProductDuplicateCode({ value: code });
  }
  return new ProductError({ message: error.message });
}

/**
 * `null` for "no code": an empty string is stored as NULL, so the unique index
 * (which ignores NULLs) always agrees with the app's "this listing has no
 * code" reading. The value itself is stored as given; uniqueness is
 * case-insensitive because the index is COLLATE NOCASE.
 */
function normalizeCode(input: ListingInput): string | null {
  const code = input.code?.trim() ?? "";
  return code === "" ? null : code;
}

function listingInsert(
  productId: string,
  listingId: string,
  input: ListingInput,
  now: number,
): Statement {
  const code = normalizeCode(input);
  return {
    sql: `INSERT INTO listings (
        listing_id, product_id, listing_name, listing_price, listing_unit, listing_kind,
        listing_code, listing_updated_at, listing_sync_at, listing_deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, NULL)`,
    bindings: [
      listingId,
      productId,
      input.name,
      input.price,
      input.unit,
      input.kind,
      code,
      now,
    ],
  };
}

function listingUpdate(input: ListingInput, listingId: string, now: number): Statement {
  const code = normalizeCode(input);
  return {
    sql: `UPDATE listings SET
        listing_name = $1, listing_price = $2, listing_unit = $3, listing_kind = $4,
        listing_code = $5, listing_updated_at = $6, listing_sync_at = NULL
      WHERE listing_id = $7`,
    bindings: [input.name, input.price, input.unit, input.kind, code, now, listingId],
  };
}

function propertyInsert(
  productId: string,
  propertyId: string,
  input: PropertyInput,
  now: number,
): Statement {
  return {
    sql: `INSERT INTO properties (
        property_id, product_id, property_key, property_value,
        property_updated_at, property_sync_at, property_deleted_at
      ) VALUES ($1, $2, $3, $4, $5, NULL, NULL)`,
    bindings: [propertyId, productId, input.key, input.value, now],
  };
}

function productNameInsert(
  productId: string,
  productNameId: string,
  input: ProductNameInput,
  now: number,
): Statement {
  return {
    sql: `INSERT INTO product_names (
        product_name_id, product_id, product_name_value,
        product_name_updated_at, product_name_sync_at, product_name_deleted_at
      ) VALUES ($1, $2, $3, $4, NULL, NULL)`,
    bindings: [productNameId, productId, input.value, now],
  };
}

const SELECT_PRODUCTS =
  "SELECT product_id, product_name, product_note, product_flag, product_updated_at, product_sync_at FROM products WHERE product_deleted_at IS NULL";
const SELECT_LISTINGS =
  "SELECT listing_id, product_id, listing_name, listing_price, listing_unit, listing_kind, listing_code, listing_updated_at, listing_sync_at FROM listings WHERE listing_deleted_at IS NULL";
const SELECT_PROPERTIES =
  "SELECT property_id, product_id, property_key, property_value, property_updated_at, property_sync_at FROM properties WHERE property_deleted_at IS NULL";
const SELECT_PRODUCT_NAMES =
  "SELECT product_name_id, product_id, product_name_value, product_name_updated_at, product_name_sync_at FROM product_names WHERE product_name_deleted_at IS NULL";
const SELECT_IMAGES =
  "SELECT image_id, product_id, image_order, image_name, image_mime, image_updated_at, image_sync_at FROM images WHERE image_deleted_at IS NULL";
const SELECT_STOCKS =
  "SELECT stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at FROM stocks";
// `record_listings` no longer carries `listing_id` (the product snapshot is the
// link now), so the sale is selected by its `product_id`; the listing id is not
// part of the sale row.
const SELECT_SALES = `
  SELECT
    NULL AS listing_id, rl.record_listing_name, rl.record_listing_kind,
    rl.record_listing_price, rl.record_listing_qty, rl.record_listing_capital,
    rl.record_listing_total, r.record_paid_at, r.record_id
  FROM record_listings rl
  JOIN records r ON r.record_id = rl.record_id
  WHERE r.record_deleted_at IS NULL
    -- A sale is 'incoming': the enum follows the money, not the goods.
    AND r.record_mode = 'incoming'
    AND rl.product_id = $1
    AND r.record_paid_at >= $2 AND r.record_paid_at < $3
  ORDER BY r.record_paid_at ASC`;
const SELECT_STOCK_OPENING =
  "SELECT COALESCE(SUM(product_event_value), 0) AS delta FROM product_events WHERE product_id = $1 AND product_event_created_at < $2";
const SELECT_STOCK_EVENTS =
  "SELECT product_event_id, product_event_created_at, product_event_value, product_event_capital, product_event_note, product_id, stock_id, record_id FROM product_events WHERE product_id = $1 AND product_event_created_at >= $2 AND product_event_created_at < $3 ORDER BY product_event_created_at ASC";

export const ProductLive = Layer.effect(
  ProductService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const productsRef = yield* SubscriptionRef.make<ProductState[]>([]);
    let loaded = false;

    function loadAll(): Effect.Effect<ProductState[], ProductError> {
      return Effect.gen(function* () {
        const [productRows, listingRows, propertyRows, productNameRows, imageRows, stockRows] =
          yield* Effect.all([
            db.selectMany<ProductRow>(SELECT_PRODUCTS),
            db.selectMany<ListingRow>(SELECT_LISTINGS),
            db.selectMany<PropertyRow>(SELECT_PROPERTIES),
            db.selectMany<ProductNameRow>(SELECT_PRODUCT_NAMES),
            db.selectMany<ImageRow>(SELECT_IMAGES),
            db.selectMany<StockRow>(SELECT_STOCKS),
          ]).pipe(Effect.mapError(dbErrorToProductError));

        return toStates({
          productRows,
          listingRows,
          propertyRows,
          productNameRows,
          imageRows,
          stockRows,
        });
      });
    }

    /**
     * The same aggregate for a handful of products. Committing a record only
     * moves the stock of the products on its lines, so a sale must not pay for
     * reading the whole catalogue: this is the bounded counterpart of `loadAll`
     * (six SELECTs, each narrowed by `product_id IN (...)`).
     */
    function loadMany(ids: string[]): Effect.Effect<ProductState[], ProductError> {
      const inList = ids.map((_, index) => `$${index + 1}`).join(", ");
      return Effect.gen(function* () {
        const [productRows, listingRows, propertyRows, productNameRows, imageRows, stockRows] =
          yield* Effect.all([
            db.selectMany<ProductRow>(`${SELECT_PRODUCTS} AND product_id IN (${inList})`, ids),
            db.selectMany<ListingRow>(`${SELECT_LISTINGS} AND product_id IN (${inList})`, ids),
            db.selectMany<PropertyRow>(`${SELECT_PROPERTIES} AND product_id IN (${inList})`, ids),
            db.selectMany<ProductNameRow>(
              `${SELECT_PRODUCT_NAMES} AND product_id IN (${inList})`,
              ids,
            ),
            db.selectMany<ImageRow>(`${SELECT_IMAGES} AND product_id IN (${inList})`, ids),
            db.selectMany<StockRow>(
              `${SELECT_STOCKS} WHERE product_id IN (${inList})`,
              ids,
            ),
          ]).pipe(Effect.mapError(dbErrorToProductError));

        return toStates({
          productRows,
          listingRows,
          propertyRows,
          productNameRows,
          imageRows,
          stockRows,
        });
      });
    }

    function toStates(rows: {
      productRows: ProductRow[];
      listingRows: ListingRow[];
      propertyRows: PropertyRow[];
      productNameRows: ProductNameRow[];
      imageRows: ImageRow[];
      stockRows: StockRow[];
    }): ProductState[] {
      const { productRows, listingRows, propertyRows, productNameRows, imageRows, stockRows } =
        rows;
      const byId = new Map<string, ProductState>();
      for (const row of productRows) {
        byId.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          note: row.product_note,
          flag: row.product_flag,
          updatedAt: row.product_updated_at,
          syncAt: row.product_sync_at,
          listings: [],
          stocks: [],
          properties: [],
          productNames: [],
          images: [],
        });
      }
      for (const row of listingRows) byId.get(row.product_id)?.listings.push(rowToListing(row));
      for (const row of propertyRows) byId.get(row.product_id)?.properties.push(rowToProperty(row));
      for (const row of productNameRows)
        byId.get(row.product_id)?.productNames.push(rowToProductName(row));
      for (const row of imageRows) byId.get(row.product_id)?.images.push(rowToImage(row));
      for (const row of stockRows) byId.get(row.product_id)?.stocks.push(rowToStock(row));

      const states = [...byId.values()];
      for (const state of states) {
        state.listings.sort((a, b) => a.name.localeCompare(b.name));
        state.properties.sort((a, b) => a.key.localeCompare(b.key));
        state.productNames.sort((a, b) => a.value.localeCompare(b.value));
        state.images.sort((a, b) => a.order - b.order);
        state.stocks.sort((a, b) => a.createdAt - b.createdAt);
      }
      states.sort((a, b) => a.name.localeCompare(b.name));
      return states;
    }

    /**
     * True when a freshly read state describes the same rows as the one in the
     * ref, compared value by value.
     *
     * The `*_updated_at` timestamps are part of the comparison, but they are
     * deliberately **not** the only signal: writers stamp them with `Date.now()`,
     * which has 1 ms granularity (coarser under load), and multi-write flows touch
     * the same rows back to back. Deciding identity from the clock alone lets two
     * writes inside one millisecond read back as "unchanged", so the ref keeps the
     * old object, emits nothing, and the POS sells the old price and old stock.
     * Comparing the handful of primitives each row actually carries cannot be
     * fooled that way.
     */
    function sameChildren<T>(a: T[], b: T[], same: (x: T, y: T) => boolean): boolean {
      return a.length === b.length && a.every((item, index) => same(item, b[index]));
    }

    function sameListing(a: Listing, b: Listing): boolean {
      return (
        a.id === b.id &&
        a.name === b.name &&
        a.price === b.price &&
        a.unit === b.unit &&
        a.kind === b.kind &&
        a.code === b.code &&
        a.updatedAt === b.updatedAt &&
        a.syncAt === b.syncAt
      );
    }

    function sameStock(a: Stock, b: Stock): boolean {
      return (
        a.id === b.id &&
        a.value === b.value &&
        a.capital === b.capital &&
        a.createdAt === b.createdAt &&
        a.updatedAt === b.updatedAt
      );
    }

    function sameProperty(a: Property, b: Property): boolean {
      return (
        a.id === b.id &&
        a.key === b.key &&
        a.value === b.value &&
        a.updatedAt === b.updatedAt &&
        a.syncAt === b.syncAt
      );
    }

    function sameProductName(a: ProductName, b: ProductName): boolean {
      return (
        a.id === b.id &&
        a.value === b.value &&
        a.updatedAt === b.updatedAt &&
        a.syncAt === b.syncAt
      );
    }

    function sameImage(a: ProductImage, b: ProductImage): boolean {
      return (
        a.id === b.id &&
        a.order === b.order &&
        a.name === b.name &&
        a.mime === b.mime &&
        a.updatedAt === b.updatedAt &&
        a.syncAt === b.syncAt
      );
    }

    function sameState(a: ProductState, b: ProductState): boolean {
      return (
        a.name === b.name &&
        a.note === b.note &&
        a.flag === b.flag &&
        a.updatedAt === b.updatedAt &&
        a.syncAt === b.syncAt &&
        sameChildren(a.listings, b.listings, sameListing) &&
        sameChildren(a.stocks, b.stocks, sameStock) &&
        sameChildren(a.properties, b.properties, sameProperty) &&
        sameChildren(a.productNames, b.productNames, sameProductName) &&
        sameChildren(a.images, b.images, sameImage)
      );
    }

    /**
     * Re-reads the catalogue. Unchanged products keep their identity, so a write
     * that touches one row does not invalidate every memoised list downstream.
     */
    function hydrate(): Effect.Effect<void, ProductError> {
      return Effect.gen(function* () {
        const states = yield* loadAll();
        const previous = yield* SubscriptionRef.get(productsRef);
        const byId = new Map(previous.map((state) => [state.id, state]));
        const merged = states.map((state) => {
          const before = byId.get(state.id);
          return before !== undefined && sameState(before, state) ? before : state;
        });
        loaded = true;
        // Nothing actually changed: do not emit, so no page re-renders.
        const unchanged =
          merged.length === previous.length && merged.every((state, i) => state === previous[i]);
        if (unchanged) return;
        yield* SubscriptionRef.set(productsRef, merged);
      });
    }

    /**
     * Re-reads only the given products and folds them into the aggregate, so a
     * committed record costs O(its lines) instead of O(catalogue). Products the
     * commit created are added, ones it removed drop out, and untouched states
     * keep their identity.
     */
    function hydrateMany(ids: string[]): Effect.Effect<void, ProductError> {
      if (ids.length === 0) return Effect.void;
      return Effect.gen(function* () {
        // Nothing to fold into yet: the first read has to be the whole catalogue.
        if (!loaded) return yield* hydrate();
        const states = yield* loadMany(ids);
        const previous = yield* SubscriptionRef.get(productsRef);
        const touched = new Set(ids);
        const fresh = new Map(states.map((state) => [state.id, state]));
        const seen = new Set<string>();
        const merged: ProductState[] = [];
        for (const state of previous) {
          if (!touched.has(state.id)) {
            merged.push(state);
            continue;
          }
          seen.add(state.id);
          const next = fresh.get(state.id);
          // Deleted by the commit: drop it rather than serving a ghost product.
          if (next === undefined) continue;
          merged.push(sameState(state, next) ? state : next);
        }
        // Products the commit created are not in the ref yet.
        for (const state of states) {
          if (!seen.has(state.id)) merged.push(state);
        }
        merged.sort((a, b) => a.name.localeCompare(b.name));
        const unchanged =
          merged.length === previous.length && merged.every((state, i) => state === previous[i]);
        if (unchanged) return;
        yield* SubscriptionRef.set(productsRef, merged);
      });
    }

    // `get.all` / `changes` hand out `Product`, not the internal `ProductState`.
    // Re-mapping them on every emission would throw away the identity
    // preservation above, so the views (and the array) are memoised.
    const productViews = new WeakMap<ProductState, Product>();
    let viewedStates: ProductState[] | null = null;
    let viewedProducts: Product[] = [];

    function toProducts(states: ProductState[]): Product[] {
      if (states === viewedStates) return viewedProducts;
      viewedStates = states;
      viewedProducts = states.map((state) => {
        const cached = productViews.get(state);
        if (cached !== undefined) return cached;
        const view = toProduct(state);
        productViews.set(state, view);
        return view;
      });
      return viewedProducts;
    }

    function ensureLoaded(): Effect.Effect<void, ProductError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function commit(statements: Statement[]): Effect.Effect<void, ProductError> {
      return db.transaction(statements).pipe(Effect.mapError(dbErrorToProductError));
    }

    function byId(id: string): Effect.Effect<ProductFull, ProductError | NotFound> {
      return ensureLoaded().pipe(
        Effect.zipRight(SubscriptionRef.get(productsRef)),
        Effect.flatMap((states) => {
          const state = states.find((s) => s.id === id);
          if (state === undefined) {
            return Effect.fail(new NotFound({ message: "Produk tidak ditemukan" }));
          }
          return Effect.succeed(toProductFull(state));
        }),
      );
    }

    return {
      get: {
        all() {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(productsRef)),
            Effect.map(toProducts),
          );
        },
        byId,
        byCode(value) {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(productsRef)),
            Effect.map((states) =>
              states
                .filter((state) =>
                  state.listings.some(
                    (listing) =>
                      listing.code !== null &&
                      listing.code.toLowerCase() === value.toLowerCase(),
                  ),
                )
                .map(toProduct),
            ),
          );
        },
        unsync() {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(productsRef)),
            Effect.map((states) => states.filter((s) => s.syncAt === null).map(toProduct)),
          );
        },
        performance(id, range) {
          return Effect.gen(function* () {
            const [sales, opening, events] = yield* Effect.all([
              db.selectMany<SaleRow>(SELECT_SALES, [id, range.from, range.to]),
              db.selectMany<{ delta: number }>(SELECT_STOCK_OPENING, [id, range.from]),
              db.selectMany<EventRow>(SELECT_STOCK_EVENTS, [id, range.from, range.to]),
            ]).pipe(Effect.mapError(dbErrorToProductError));
            return {
              sales: sales.map(rowToSale),
              stockOpening: opening[0]?.delta ?? 0,
              stockEvents: events.map(rowToEvent),
            };
          });
        },
        changes: Stream.unwrap(
          ensureLoaded().pipe(
            Effect.as(
              productsRef.changes.pipe(Stream.map(toProducts)),
            ),
          ),
        ),
        changesFull: Stream.unwrap(
          ensureLoaded().pipe(
            Effect.as(
              productsRef.changes.pipe(Stream.map((states) => states.map(toProductFull))),
            ),
          ),
        ),
      },
      add(input) {
        return Effect.gen(function* () {
          // The one place the *values* are checked: a negative price or a
          // negative cost basis must never reach `listings`/`stocks`, whichever
          // writer asked for the insert (form or JSON import).
          const invalid = validateProductInput(input);
          if (invalid !== null) {
            return yield* Effect.fail(new ProductError({ message: invalid }));
          }

          const productId = generateId();
          const now = Date.now();
          const statements: Statement[] = [
            {
              sql: `INSERT INTO products (
                  product_id, product_name, product_note,
                  product_updated_at, product_sync_at, product_deleted_at
                ) VALUES ($1, $2, $3, $4, NULL, NULL)`,
              bindings: [productId, input.name, input.note, now],
            },
          ];
          for (const listing of input.listings) {
            statements.push(listingInsert(productId, generateId(), listing, now));
          }
          for (const stock of input.stocks) {
            statements.push(...receiveStatements(productId, stock, now));
          }
          for (const property of input.properties) {
            statements.push(propertyInsert(productId, generateId(), property, now));
          }

          const code = input.listings.find((listing) => listing.code)?.code ?? null;
          yield* db
            .transaction(statements)
            .pipe(Effect.mapError((error) => codeErrorToProductError(error, code)));
          yield* hydrateMany([productId]);
          return productId;
        });
      },
      set: {
        info(id, info) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE products SET
                    product_name = $1, product_note = $2,
                    product_updated_at = $3, product_sync_at = NULL
                  WHERE product_id = $4`,
                bindings: [info.name, info.note, now, id],
              },
            ]);
            yield* hydrateMany([id]);
          });
        },
        publish(id, published) {
          return Effect.gen(function* () {
            const now = Date.now();
            // Masked, not assigned: another meaning may share `product_flag`
            // later, and publishing must not clear its bits.
            const next = published
              ? `product_flag & ~${PRODUCT_FLAG_UNPUBLISHED}`
              : `product_flag | ${PRODUCT_FLAG_UNPUBLISHED}`;
            yield* commit([
              {
                sql: `UPDATE products SET
                    product_flag = ${next},
                    product_updated_at = $1, product_sync_at = NULL
                  WHERE product_id = $2`,
                bindings: [now, id],
              },
            ]);
            yield* hydrateMany([id]);
          });
        },
        listing: {
          add(productId, input) {
            return Effect.gen(function* () {
              const listingId = generateId();
              const now = Date.now();
              yield* db
                .transaction([
                  listingInsert(productId, listingId, input, now),
                  touchProduct(productId, now),
                ])
                .pipe(Effect.mapError((error) => codeErrorToProductError(error, input.code)));
              yield* hydrateMany([productId]);
              return listingId;
            });
          },
          update(productId, listingId, input) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* db
                .transaction([listingUpdate(input, listingId, now), touchProduct(productId, now)])
                .pipe(Effect.mapError((error) => codeErrorToProductError(error, input.code)));
              yield* hydrateMany([productId]);
            });
          },
          remove(productId, listingId) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: "UPDATE listings SET listing_deleted_at = $1, listing_sync_at = NULL WHERE listing_id = $2",
                  bindings: [now, listingId],
                },
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
            });
          },
        },
        property: {
          add(productId, input) {
            return Effect.gen(function* () {
              const propertyId = generateId();
              const now = Date.now();
              yield* commit([
                propertyInsert(productId, propertyId, input, now),
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
              return propertyId;
            });
          },
          update(productId, propertyId, input) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: `UPDATE properties SET
                      property_key = $1, property_value = $2,
                      property_updated_at = $3, property_sync_at = NULL
                    WHERE property_id = $4`,
                  bindings: [input.key, input.value, now, propertyId],
                },
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
            });
          },
          remove(productId, propertyId) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: "UPDATE properties SET property_deleted_at = $1, property_sync_at = NULL WHERE property_id = $2",
                  bindings: [now, propertyId],
                },
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
            });
          },
        },
        productName: {
          add(productId, input) {
            return Effect.gen(function* () {
              const productNameId = generateId();
              const now = Date.now();
              yield* commit([
                productNameInsert(productId, productNameId, input, now),
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
              return productNameId;
            });
          },
          update(productId, productNameId, input) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: `UPDATE product_names SET
                      product_name_value = $1,
                      product_name_updated_at = $2, product_name_sync_at = NULL
                    WHERE product_name_id = $3`,
                  bindings: [input.value, now, productNameId],
                },
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
            });
          },
          remove(productId, productNameId) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: "UPDATE product_names SET product_name_deleted_at = $1, product_name_sync_at = NULL WHERE product_name_id = $2",
                  bindings: [now, productNameId],
                },
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
            });
          },
        },
        image: {
          add(productId, input: ImageInput) {
            return Effect.gen(function* () {
              const imageId = generateId();
              const now = Date.now();
              yield* commit([
                {
                  sql: `INSERT INTO images (
                      image_id, image_order, image_name, image_mime, product_id,
                      image_updated_at, image_sync_at, image_deleted_at
                    ) VALUES (
                      $1,
                      (SELECT COALESCE(MAX(image_order), -1) + 1 FROM images
                        WHERE product_id = $2 AND image_deleted_at IS NULL),
                      $3, $4, $2, $5, NULL, NULL
                    )`,
                  bindings: [imageId, productId, input.name, input.mime, now],
                },
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
              return imageId;
            });
          },
          commit(productId, order, drafts) {
            return Effect.gen(function* () {
              const now = Date.now();
              const pending = new Map(drafts.map((draft) => [draft.id, draft]));
              const statements: Statement[] = order.map((imageId, index) => {
                const draft = pending.get(imageId);
                if (draft !== undefined) {
                  return {
                    sql: `INSERT INTO images (
                        image_id, image_order, image_name, image_mime, product_id,
                        image_updated_at, image_sync_at, image_deleted_at
                      ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
                    bindings: [imageId, index, draft.name, draft.mime, productId, now],
                  };
                }
                return {
                  sql: `UPDATE images SET
                      image_order = $1, image_updated_at = $2, image_sync_at = NULL
                    WHERE image_id = $3 AND product_id = $4`,
                  bindings: [index, now, imageId, productId],
                };
              });
              statements.push(touchProduct(productId, now));
              yield* commit(statements);
              yield* hydrateMany([productId]);
            });
          },
          remove(productId, imageId) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: "UPDATE images SET image_deleted_at = $1, image_sync_at = NULL WHERE image_id = $2",
                  bindings: [now, imageId],
                },
                touchProduct(productId, now),
              ]);
              yield* hydrateMany([productId]);
            });
          },
          reorder(productId, imageIds) {
            return Effect.gen(function* () {
              const now = Date.now();
              const statements: Statement[] = imageIds.map((imageId, index) => ({
                sql: `UPDATE images SET
                    image_order = $1, image_updated_at = $2, image_sync_at = NULL
                  WHERE image_id = $3`,
                bindings: [index, now, imageId],
              }));
              statements.push(touchProduct(productId, now));
              yield* commit(statements);
              yield* hydrateMany([productId]);
            });
          },
        },
      },
      stock: {
        receive(productId, input) {
          return Effect.gen(function* () {
            yield* commit(receiveStatements(productId, input, Date.now()));
            yield* hydrateMany([productId]);
          });
        },
        consume(productId, input) {
          return Effect.gen(function* () {
            yield* ensureLoaded();
            const states = yield* SubscriptionRef.get(productsRef);
            const state = states.find((s) => s.id === productId);
            if (state === undefined) {
              return yield* Effect.fail(new ProductError({ message: "Produk tidak ditemukan" }));
            }
            const lots: StockLot[] = state.stocks.map((lot) => ({
              id: lot.id,
              value: lot.value,
              capital: lot.capital,
            }));
            const { statements, shortage } = consumeStatements(
              productId,
              lots,
              input.value,
              Date.now(),
              input.note ?? "",
            );
            if (shortage > 0) {
              return yield* Effect.fail(new ProductError({ message: "Stok tidak mencukupi" }));
            }
            yield* commit(statements);
            yield* hydrateMany([productId]);
          });
        },
        adjust(productId, stockId, input) {
          return Effect.gen(function* () {
            yield* ensureLoaded();
            const states = yield* SubscriptionRef.get(productsRef);
            const state = states.find((s) => s.id === productId);
            if (state === undefined) {
              return yield* Effect.fail(new ProductError({ message: "Produk tidak ditemukan" }));
            }
            const lot = state.stocks.find((s) => s.id === stockId);
            if (lot === undefined) {
              return yield* Effect.fail(new ProductError({ message: "Lot tidak ditemukan" }));
            }
            yield* commit(
              adjustStatements(
                productId,
                { id: lot.id, value: lot.value, capital: lot.capital },
                input,
                Date.now(),
                input.note ?? "",
              ),
            );
            yield* hydrateMany([productId]);
          });
        },
        history(productId, input) {
          // Row-value keyset on the full sort key, and the Masuk/Keluar filter in
          // SQL. The previous version used `created_at < cursor` alone, so a page
          // boundary inside a group of same-instant events (one record commit
          // writes one event per lot at one `now`) silently dropped the rest of
          // the group, and it filtered by direction only after paging.
          return db
            .selectMany<EventRow>(
              `SELECT
                  product_event_id, product_event_created_at, product_event_value,
                  product_event_capital, product_event_note, product_id, stock_id, record_id
                FROM product_events
                WHERE product_id = $1
                  AND (
                    $2 IS NULL
                    OR product_event_created_at < $2
                    OR (product_event_created_at = $2 AND product_event_id < $3)
                  )
                  AND (
                    $4 IS NULL
                    OR ($4 = 'in' AND product_event_value > 0)
                    OR ($4 = 'out' AND product_event_value < 0)
                  )
                ORDER BY product_event_created_at DESC, product_event_id DESC
                LIMIT $5`,
              [
                productId,
                input.before?.createdAt ?? null,
                input.before?.id ?? null,
                input.mode ?? null,
                input.limit,
              ],
            )
            .pipe(
              Effect.mapError(dbErrorToProductError),
              Effect.map((rows) => rows.map(rowToEvent)),
            );
        },
      },
      delete(id) {
        return Effect.gen(function* () {
          const now = Date.now();
          yield* commit([
            {
              sql: `UPDATE products SET
                  product_deleted_at = $1, product_sync_at = NULL, product_updated_at = $2
                WHERE product_id = $3`,
              bindings: [now, now, id],
            },
          ]);
          yield* hydrateMany([id]);
        });
      },
      refresh: () => hydrate(),
      refreshMany: (ids) => hydrateMany(ids),
    };
  }),
);
