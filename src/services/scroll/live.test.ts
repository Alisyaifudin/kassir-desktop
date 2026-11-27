import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { makeTestLocalStorage } from "../local-storage/test-support";
import { ScrollService, type ScrollAnchor } from ".";
import { ScrollLive } from "./live";

/**
 * Where each list was left. The list itself is the DOM's; this only has to hand
 * the same position back on the next visit, and to be honest about one thing: a
 * value written on one day must never be read as a position in another day's
 * records.
 */
const DAY = 1_767_225_600_000;

function setup(seed: Record<string, unknown> = {}) {
  const storage = makeTestLocalStorage(seed);
  return {
    entries: storage.entries,
    state: storage.state,
    layer: ScrollLive.pipe(Layer.provide(storage.layer)),
  };
}

function run<A>(
  layer: Layer.Layer<ScrollService>,
  program: (scroll: Context.Tag.Service<typeof ScrollService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const scroll = yield* ScrollService;
      return yield* program(scroll);
    }).pipe(Effect.provide(layer)),
  );
}

const anchored: ScrollAnchor["records"] = {
  day: DAY,
  values: { "time:desc": 1_000, "total:asc": 250 },
};

describe("ScrollService", () => {
  test("with nothing stored there is no position for any list", async () => {
    const { layer } = setup();

    expect(await run(layer, (scroll) => scroll.get("records"))).toEqual({
      day: null,
      values: {},
    });
  });

  test("a stored position is what the first read returns", async () => {
    const { layer } = setup({ "scroll-records": anchored });

    expect(await run(layer, (scroll) => scroll.get("records"))).toEqual(anchored);
  });

  test("an entry that no longer parses costs the position, not the list", async () => {
    // Every shape a previous build (or a hand-edited entry) can leave behind,
    // with what is still readable in it.
    const junk: { stored: unknown; readable: ScrollAnchor["records"] }[] = [
      { stored: "bukan json", readable: { day: null, values: {} } },
      { stored: 42, readable: { day: null, values: {} } },
      { stored: null, readable: { day: null, values: {} } },
      { stored: { day: "kemarin", values: [1, 2] }, readable: { day: null, values: {} } },
      { stored: { day: DAY, values: { "time:desc": "1000", "total:asc": 250 } }, readable: { day: DAY, values: { "total:asc": 250 } } },
      { stored: { day: DAY, values: { "time:desc": Number.NaN } }, readable: { day: DAY, values: {} } },
    ];

    for (const { stored, readable } of junk) {
      const { layer } = setup({ "scroll-records": stored });

      expect(await run(layer, (scroll) => scroll.get("records"))).toEqual(readable);
    }
  });

  test("a position is persisted, and the next launch reads it back", async () => {
    const { entries, layer } = setup();

    await run(layer, (scroll) => scroll.set("records", anchored));

    expect(entries.get("scroll-records")).toEqual(anchored);
    expect(await run(layer, (scroll) => scroll.get("records"))).toEqual(anchored);
  });

  test("one order is written beside the others, not over them", async () => {
    const { layer } = setup({ "scroll-records": anchored });

    await run(layer, (scroll) =>
      scroll.set("records", { day: DAY, values: { ...anchored.values, "total:desc": 900 } }),
    );

    expect(await run(layer, (scroll) => scroll.get("records"))).toEqual({
      day: DAY,
      values: { "time:desc": 1_000, "total:asc": 250, "total:desc": 900 },
    });
  });

  test("re-remembering the same place does not touch the store", async () => {
    const { state, layer } = setup({ "scroll-records": anchored });

    // Flicking the wheel inside one tall record settles the list on the row it
    // started on. A second write of the same place must cost nothing — and must
    // not become an error on a store that has since filled up.
    const again = await run(layer, (scroll) =>
      Effect.gen(function* () {
        state.failure = "local storage penuh";
        return yield* Effect.either(scroll.set("records", anchored));
      }),
    );

    expect(again._tag).toBe("Right");
  });

  test("a refused write reports a ScrollError and leaves the memory on the stored value", async () => {
    const { entries, state, layer } = setup({ "scroll-records": anchored });

    const result = await run(layer, (scroll) =>
      Effect.gen(function* () {
        state.failure = "local storage penuh";
        const written = yield* Effect.either(
          scroll.set("records", { day: DAY, values: { "time:desc": 2_000 } }),
        );
        return { written, anchor: yield* scroll.get("records") };
      }),
    );

    expect(result.written._tag).toBe("Left");
    if (result.written._tag === "Left") {
      expect(result.written.left._tag).toBe("ScrollError");
      expect(result.written.left.message).toBe("local storage penuh");
    }
    // Not ahead of the disk: the next scroll retries instead of skipping.
    expect(result.anchor).toEqual(anchored);
    expect(entries.get("scroll-records")).toEqual(anchored);
  });
});

/**
 * The product list keeps a second shape in the same store: the product it starts at
 * and the box's offset. Each container is written to its own key, so the two lists
 * can never read each other's position.
 */
describe("ScrollService, the other shapes", () => {
  const products: ScrollAnchor["products"] = {
    key: "|cash|all|name|asc|2|20",
    view: "table",
    id: "p7",
    top: 148,
  };

  test("a product position is persisted under its own key", async () => {
    const { entries, layer } = setup({ "scroll-records": anchored });

    await run(layer, (scroll) => scroll.set("products", products));

    expect(entries.get("scroll-products")).toEqual(products);
    // The records' position is untouched by a write to another container.
    expect(entries.get("scroll-records")).toEqual(anchored);
    expect(await run(layer, (scroll) => scroll.get("products"))).toEqual(products);
  });

  test("a product entry that no longer parses falls back to the top", async () => {
    const junk: { stored: unknown; readable: ScrollAnchor["products"] }[] = [
      { stored: "bukan json", readable: { key: "", view: "", id: null, top: 0 } },
      { stored: { key: "k", view: "grid", id: 7, top: "148" }, readable: { key: "k", view: "grid", id: null, top: 0 } },
      { stored: { key: "k", view: "grid", id: "", top: -20 }, readable: { key: "k", view: "grid", id: null, top: 0 } },
      { stored: { key: "k", view: "grid", id: "p1", top: Number.POSITIVE_INFINITY }, readable: { key: "k", view: "grid", id: "p1", top: 0 } },
    ];

    for (const { stored, readable } of junk) {
      const { layer } = setup({ "scroll-products": stored });

      expect(await run(layer, (scroll) => scroll.get("products"))).toEqual(readable);
    }
  });
});

/**
 * The cart screen keeps a third shape: one offset per open cart (tab). The tabs are
 * drafts, and a draft is deleted for good when it is closed, so the store is capped —
 * a position for a cart that no longer exists is worth nothing.
 */
describe("ScrollService, cart positions", () => {
  test("one offset per cart, under its own key", async () => {
    const { entries, layer } = setup({ "scroll-products": { key: "k", view: "grid", id: "p1", top: 9 } });

    await run(layer, (scroll) =>
      scroll.set("cart", { positions: { "draft-a": 240, "draft-b": 80 } }),
    );

    expect(entries.get("scroll-cart")).toEqual({ positions: { "draft-a": 240, "draft-b": 80 } });
    // The other lists are untouched by a cart's write.
    expect(entries.get("scroll-products")).toEqual({ key: "k", view: "grid", id: "p1", top: 9 });
  });

  test("an offset that is not a positive number is dropped", async () => {
    const { layer } = setup({
      "scroll-cart": { positions: { a: 240, b: "80", c: -5, d: 0, e: Number.NaN } },
    });

    expect(await run(layer, (scroll) => scroll.get("cart"))).toEqual({
      positions: { a: 240 },
    });
  });

  test("the store keeps a bounded number of carts, newest last", async () => {
    const positions: Record<string, number> = {};
    for (let index = 0; index < 60; index += 1) positions[`draft-${index}`] = index + 1;
    const { layer } = setup({ "scroll-cart": { positions } });

    const kept = await run(layer, (scroll) => scroll.get("cart"));

    expect(Object.keys(kept.positions)).toHaveLength(50);
    // The most recently written carts are the ones that survive.
    expect(kept.positions["draft-59"]).toBe(60);
    expect(kept.positions["draft-9"]).toBeUndefined();
  });
});

/**
 * The Analytics shell's content box is one box, and its position is the container's:
 * one entry under its own key, so the Products table comes back to where it was left.
 */
describe("ScrollService, the analytics box", () => {
  test("the container's position is persisted under its own key", async () => {
    const { entries, layer } = setup();

    await run(layer, (scroll) => scroll.set("analytics", { positions: { box: 1_240 } }));

    expect(entries.get("scroll-analytics")).toEqual({ positions: { box: 1_240 } });
    expect(await run(layer, (scroll) => scroll.get("analytics"))).toEqual({
      positions: { box: 1_240 },
    });
  });

  test("an entry that no longer parses starts the box at the top", async () => {
    const { layer } = setup({ "scroll-analytics": { positions: { box: "1440" } } });

    expect(await run(layer, (scroll) => scroll.get("analytics"))).toEqual({ positions: {} });
  });

  test("unlike the cart's tabs, nothing here is capped", async () => {
    const positions: Record<string, number> = {};
    for (let index = 0; index < 60; index += 1) positions[`slot-${index}`] = index + 1;
    const { layer } = setup({ "scroll-analytics": { positions } });

    const kept = await run(layer, (scroll) => scroll.get("analytics"));

    expect(Object.keys(kept.positions)).toHaveLength(60);
  });
});
