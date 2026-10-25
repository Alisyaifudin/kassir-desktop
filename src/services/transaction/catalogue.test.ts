import type { Database } from "bun:sqlite";
import { describe, expect, spyOn, test } from "bun:test";
import { Effect, Layer } from "effect";
import { recalcDiscounts } from "~/lib/purchase";
import { makeTestDatabase } from "../db/test-support";
import { ListingLive } from "../listing/live";
import { ListingService } from "../listing";
import { ProductService } from "../product";
import { ProductLive } from "../product/live";
import { RecordLive } from "../record/live";
import { TransactionService, type DraftListing } from ".";
import { TransactionLive } from "./live";

/**
 * The composite iteration 1 was about, asserted in one tick: a committed sale
 * must change what the POS reads next.
 *
 * The unit suites each check one link (`submit` writes the stock movement,
 * `ProductService` refreshes, `ListingService` projects) but nothing checked the
 * whole chain, so a change detector that quietly decided "nothing changed" could
 * only be caught by a flaky test.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));
  const transactionLayer = TransactionLive.pipe(
    Layer.provide(layer),
    Layer.provide(recordLayer),
  );
  const listingLayer = ListingLive.pipe(Layer.provide(layer), Layer.provide(productLayer));
  return {
    db,
    layer: Layer.mergeAll(transactionLayer, listingLayer, productLayer),
  };
}

function seed(db: Database) {
  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1);
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO listings (
      listing_id, product_id, listing_name, listing_price, listing_unit,
      listing_kind, listing_updated_at
    ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 7, 5000, 1, 1);
  `);
}

const line: DraftListing = {
  id: "line-1",
  listingId: "l1",
  name: "Kopi",
  code: "",
  unit: 1,
  price: 10000,
  qty: 1,
  discounts: recalcDiscounts(10000, 1, []),
};

type Services =
  | TransactionService
  | ListingService
  | ProductService;

function run<A>(
  layer: Layer.Layer<Services>,
  program: () => Effect.Effect<A, unknown, Services>,
) {
  return Effect.runPromise(program().pipe(Effect.provide(layer)));
}

describe("a committed sale reaches the catalogue the POS reads", () => {
  test("stock drops and the price survives, read in the same tick", async () => {
    const { db, layer } = setup();
    seed(db);

    const result = await run(layer, () =>
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const product = yield* ProductService;
        const listing = yield* ListingService;

        const before = {
          stock: (yield* product.get.byId("p1")).stock,
          card: (yield* listing.get.all())[0].stock,
        };

        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [line]);
        yield* tx.methods.set(id, [{ id: "m1", methodId: "cash", value: 10000 }]);
        yield* tx.submit(id, { cashier: "Kasir" });

        const [afterProduct] = yield* Effect.all([product.get.byId("p1")]);
        const [afterCard] = yield* listing.get.all();
        return { before, afterProduct, afterCard };
      }),
    );

    expect(result.before).toEqual({ stock: 7, card: 7 });
    expect(result.afterProduct.stock).toBe(6);
    expect(result.afterCard.stock).toBe(6);
    expect(result.afterCard.price).toBe(10_000);
  });

  test("a repriced listing in the same millisecond is what the POS sells", async () => {
    const { db, layer } = setup();
    seed(db);
    const clock = spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    try {
      const result = await run(layer, () =>
        Effect.gen(function* () {
          const product = yield* ProductService;
          const listing = yield* ListingService;

          const [sellable] = yield* listing.get.all();
          yield* product.set.listing.update("p1", sellable.id, {
            name: "Kopi",
            price: 12_500,
            unit: 1,
            kind: "retail",
            code: null,
          });
          return (yield* listing.get.all())[0];
        }),
      );

      expect(result.price).toBe(12_500);
    } finally {
      clock.mockRestore();
    }
  });
});
