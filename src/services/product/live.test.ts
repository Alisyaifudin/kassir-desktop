import { describe, expect, test } from "bun:test";
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
});
