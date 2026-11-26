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

const anchored: ScrollAnchor = { day: DAY, values: { "time:desc": 1_000, "total:asc": 250 } };

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
    const junk: { stored: unknown; readable: ScrollAnchor }[] = [
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
