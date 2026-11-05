import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { CategoryService } from ".";
import { makeTestDatabase } from "../db/test-support";
import { CategoryLive } from "./live";

/**
 * The category catalogue is read by the product form's picker and ordered by name
 * in SQL. A write re-reads only the one row and re-sorts locally, so the folded-in
 * order has to match what a full re-read would have produced — otherwise the
 * picker shuffles under the cursor after a rename.
 *
 * The name is the row's identity to a human, and the table holds one live row per
 * name case-insensitively, so the duplicate rule is pinned here too: it is the
 * only constraint the UI has to explain.
 */
function run<A>(
  layer: Layer.Layer<CategoryService>,
  program: (category: Context.Tag.Service<typeof CategoryService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const category = yield* CategoryService;
      return yield* program(category);
    }).pipe(Effect.provide(layer)),
  );
}

function setup() {
  const { layer } = makeTestDatabase();
  return CategoryLive.pipe(Layer.provide(layer));
}

describe("category catalogue after a narrow refresh", () => {
  test("a rename re-sorts the category into its new place", async () => {
    const layer = setup();
    const names = await run(layer, (category) =>
      Effect.gen(function* () {
        yield* category.add({ name: "Sabun" });
        const minuman = yield* category.add({ name: "Minuman" });
        yield* category.add({ name: "Makanan" });
        yield* category.set.name(minuman, "Rokok");
        const items = yield* category.get.all();
        return items.map((item) => item.name);
      }),
    );
    expect(names).toEqual(["Makanan", "Rokok", "Sabun"]);
  });

  test("a delete drops the category without a full re-read", async () => {
    const layer = setup();
    const names = await run(layer, (category) =>
      Effect.gen(function* () {
        yield* category.add({ name: "Minuman" });
        const sabun = yield* category.add({ name: "Sabun" });
        yield* category.delete.byId(sabun);
        const items = yield* category.get.all();
        return items.map((item) => item.name);
      }),
    );
    expect(names).toEqual(["Minuman"]);
  });

  test("a duplicate name is refused, case-insensitively", async () => {
    const layer = setup();
    const error = await run(layer, (category) =>
      Effect.gen(function* () {
        yield* category.add({ name: "Minuman" });
        return yield* Effect.flip(category.add({ name: "minuman" }));
      }),
    );
    expect(error._tag).toBe("CategoryDuplicateName");
    if (error._tag === "CategoryDuplicateName") expect(error.value).toBe("minuman");
  });

  test("a deleted category frees its name", async () => {
    const layer = setup();
    const names = await run(layer, (category) =>
      Effect.gen(function* () {
        const minuman = yield* category.add({ name: "Minuman" });
        yield* category.delete.byId(minuman);
        yield* category.add({ name: "Minuman" });
        const items = yield* category.get.all();
        return items.map((item) => item.name);
      }),
    );
    expect(names).toEqual(["Minuman"]);
  });
});
