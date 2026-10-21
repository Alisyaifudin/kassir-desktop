import { describe, expect, spyOn, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductService } from ".";
import { ProductLive } from "./live";

function setup() {
  const { db, layer } = makeTestDatabase();
  return { db, layer: ProductLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<ProductService>,
  program: (product: Context.Tag.Service<typeof ProductService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const product = yield* ProductService;
      return yield* program(product);
    }).pipe(Effect.provide(layer)),
  );
}

function input(name: string) {
  return {
    name,
    note: "",
    listings: [
      { name, price: 1000, unit: 1, kind: "retail", code: name, codeKind: "barcode" as const },
    ],
    stocks: [{ value: 5, capital: 500 }],
    properties: [],
  };
}

describe("product catalogue identity", () => {
  test("a rename leaves every other product's object identity intact", async () => {
    const { layer } = setup();

    const result = await run(layer, (product) =>
      Effect.gen(function* () {
        const kopi = yield* product.add(input("Kopi"));
        yield* product.add(input("Teh"));
        const before = yield* product.get.all();

        yield* product.set.info(kopi, { name: "Kopi Susu", note: "" });
        const after = yield* product.get.all();

        const other = (items: typeof before) => items.find((item) => item.name === "Teh");
        return {
          otherIsSameObject: other(before) === other(after),
          editedIsNewObject:
            before.find((item) => item.name === "Kopi") !==
            after.find((item) => item.name === "Kopi Susu"),
          editedName: after.find((item) => item.name === "Kopi Susu")?.name,
        };
      }),
    );

    // The untouched row is the *same object*, so memoised lists skip it.
    expect(result.otherIsSameObject).toBe(true);
    expect(result.editedIsNewObject).toBe(true);
    expect(result.editedName).toBe("Kopi Susu");
  });

  test("a refresh that finds nothing new does not re-emit", async () => {
    const { layer } = setup();

    const same = await run(layer, (product) =>
      Effect.gen(function* () {
        yield* product.add(input("Kopi"));
        const before = yield* product.get.all();
        yield* product.refresh();
        const after = yield* product.get.all();
        return after === before;
      }),
    );

    expect(same).toBe(true);
  });

  // The identity check must survive two writes landing inside the same
  // millisecond: `Date.now()` is the writers' only clock, and a same-tick
  // "read back, compare timestamps" used to report the old row as unchanged,
  // so the ref never emitted and the POS kept the old price and stock.
  test("a price edit inside one millisecond is not mistaken for no change", async () => {
    const { layer } = setup();
    const now = Date.now();
    const clock = spyOn(Date, "now").mockReturnValue(now);

    try {
      const result = await run(layer, (product) =>
        Effect.gen(function* () {
          const id = yield* product.add(input("Kopi"));
          const [before] = yield* product.get.all();
          yield* product.set.listing.update(id, before.listings[0].id, {
            name: "Kopi",
            price: 2500,
            unit: 1,
            kind: "retail",
            code: "Kopi",
            codeKind: "barcode",
          });
          const [after] = yield* product.get.all();
          return { price: after.listings[0].price, replaced: after !== before };
        }),
      );

      expect(result.price).toBe(2500);
      expect(result.replaced).toBe(true);
    } finally {
      clock.mockRestore();
    }
  });

  test("a stock movement inside one millisecond is not mistaken for no change", async () => {
    const { layer } = setup();
    const now = Date.now();
    const clock = spyOn(Date, "now").mockReturnValue(now);

    try {
      const result = await run(layer, (product) =>
        Effect.gen(function* () {
          const id = yield* product.add(input("Kopi"));
          expect((yield* product.get.byId(id)).stock).toBe(5);
          yield* product.stock.receive(id, { value: 3, capital: 700 });
          return (yield* product.get.byId(id)).stock;
        }),
      );

      expect(result).toBe(8);
    } finally {
      clock.mockRestore();
    }
  });
});

describe("product.add value boundary", () => {
  test("a negative price is refused and nothing is written", async () => {
    const { layer } = setup();

    const result = await run(layer, (product) =>
      Effect.gen(function* () {
        const invalid = {
          ...input("Kopi"),
          listings: [{ ...input("Kopi").listings[0], price: -1000 }],
        };
        const outcome = yield* Effect.either(product.add(invalid));
        const all = yield* product.get.all();
        return { outcome, count: all.length };
      }),
    );

    expect(result.outcome._tag).toBe("Left");
    expect(result.count).toBe(0);
  });

  test("a negative stock capital is refused", async () => {
    const { layer } = setup();

    const outcome = await run(layer, (product) =>
      Effect.either(product.add({ ...input("Kopi"), stocks: [{ value: 5, capital: -500 }] })),
    );

    expect(outcome._tag).toBe("Left");
  });
});
