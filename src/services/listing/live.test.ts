import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductService, type ListingInput } from "../product";
import { ProductLive } from "../product/live";
import { ListingService } from ".";
import { ListingLive } from "./live";

function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const listingLayer = ListingLive.pipe(Layer.provide(layer), Layer.provide(productLayer));
  return { db, layer: Layer.mergeAll(productLayer, listingLayer) };
}

function run<A>(
  layer: Layer.Layer<ProductService | ListingService>,
  program: (
    product: Context.Tag.Service<typeof ProductService>,
    listing: Context.Tag.Service<typeof ListingService>,
  ) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const product = yield* ProductService;
      const listing = yield* ListingService;
      return yield* program(product, listing);
    }).pipe(Effect.provide(layer)),
  );
}

const input = {
  name: "Kopi",
  note: "",
  listings: [
    {
      name: "Kopi Sachet",
      price: 1000,
      unit: 1,
      kind: "retail",
      code: "K1",
    },
  ],
  stocks: [{ value: 5, capital: 500 }],
  properties: [],
};

const edited: ListingInput = {
  name: "Kopi Sachet",
  price: 2500,
  unit: 1,
  kind: "retail",
  code: "K1",
};

describe("listing service", () => {
  test("a new product is sellable in the same session, with its stock", async () => {
    const { layer } = setup();
    const after = await run(layer, (product, listing) =>
      Effect.gen(function* () {
        expect(yield* listing.get.all()).toHaveLength(0);
        yield* product.add(input);
        return yield* listing.get.search("kopi");
      }),
    );

    expect(after).toHaveLength(1);
    expect(after[0].name).toBe("Kopi Sachet");
    expect(after[0].price).toBe(1000);
    expect(after[0].stock).toBe(5);
    expect(after[0].productName).toBe("Kopi");
  });

  test("repricing a listing is visible without a reload", async () => {
    const { layer } = setup();
    const after = await run(layer, (product, listing) =>
      Effect.gen(function* () {
        const productId = yield* product.add(input);
        const [before] = yield* listing.get.search("kopi");
        expect(before.price).toBe(1000);
        yield* product.set.listing.update(productId, before.id, edited);
        return yield* listing.get.search("kopi");
      }),
    );

    expect(after[0].price).toBe(2500);
  });

  test("deleting a listing removes it from the POS catalogue", async () => {
    const { layer } = setup();
    const after = await run(layer, (product, listing) =>
      Effect.gen(function* () {
        const productId = yield* product.add(input);
        const [sellable] = yield* listing.get.search("kopi");
        yield* product.set.listing.remove(productId, sellable.id);
        return yield* listing.get.all();
      }),
    );

    expect(after).toHaveLength(0);
  });
});

describe("withdrawn products", () => {
  test("a product that is not published is not sellable, and comes back when it is", async () => {
    const { layer } = setup();
    const result = await run(layer, (product, listing) =>
      Effect.gen(function* () {
        const productId = yield* product.add(input);
        expect(yield* listing.get.all()).toHaveLength(1);

        yield* product.set.publish(productId, false);
        const all = yield* listing.get.all();
        const search = yield* listing.get.search("kopi");
        // The barcode path reads the same catalogue, so it stops matching too.
        const byCode = yield* listing.get.search("K1");
        // `changes` is what the Pos and Restock screens subscribe to.
        const streamed = yield* Stream.runHead(listing.get.changes);

        yield* product.set.publish(productId, true);
        const back = yield* listing.get.all();
        return { all, search, byCode, streamed, back };
      }),
    );

    expect(result.all).toHaveLength(0);
    expect(result.search).toHaveLength(0);
    expect(result.byCode).toHaveLength(0);
    expect(result.streamed._tag).toBe("Some");
    expect(result.streamed._tag === "Some" ? result.streamed.value : null).toHaveLength(0);
    expect(result.back).toHaveLength(1);
  });
});
