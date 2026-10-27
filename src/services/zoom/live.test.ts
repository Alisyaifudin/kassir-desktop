import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Context, Effect, Layer, Option, Stream } from "effect";
import { makeTestLocalStorage } from "../local-storage/test-support";
import { DEFAULT_ZOOM, ZoomService } from ".";

/**
 * The interface scale lives in two places: localStorage, which is the preference
 * for the next launch, and the webview's own scale, which is what the operator
 * sees now. These tests pin both — the boot-time apply, the persist, and the two
 * ways a change can go wrong (a webview that refuses it, a storage that is full).
 */
const applied: number[] = [];
let refused: string | null = null;

mock.module("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    setZoom: async (zoom: number) => {
      if (refused !== null) throw new Error(refused);
      applied.push(zoom);
    },
  }),
}));

// Imported after the mock: a static import would load the real webview module.
const { ZoomLive } = await import("./live");

function setup(seed: Record<string, unknown> = {}) {
  const storage = makeTestLocalStorage(seed);
  return {
    entries: storage.entries,
    state: storage.state,
    layer: ZoomLive.pipe(Layer.provide(storage.layer)),
  };
}

function run<A>(
  layer: Layer.Layer<ZoomService>,
  program: (zoom: Context.Tag.Service<typeof ZoomService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const zoom = yield* ZoomService;
      return yield* program(zoom);
    }).pipe(Effect.provide(layer)),
  );
}

/** The factor `global.css` multiplies lucide strokes by, as the service wrote it. */
function iconScale(): number {
  return Number(document.documentElement.style.getPropertyValue("--icon-scale"));
}

beforeEach(() => {
  applied.length = 0;
  refused = null;
  document.documentElement.style.removeProperty("--icon-scale");
});

describe("ZoomService", () => {
  test("with nothing stored the interface opens at 100%", async () => {
    const { layer } = setup();

    expect(await run(layer, (zoom) => zoom.get())).toBe(DEFAULT_ZOOM);
    expect(DEFAULT_ZOOM).toBe(1);
  });

  test("a stored level is what the first read returns", async () => {
    expect(await run(setup({ zoom: 1.5 }).layer, (zoom) => zoom.get())).toBe(1.5);
    expect(await run(setup({ zoom: 2 }).layer, (zoom) => zoom.get())).toBe(2);
  });

  test("a stored value that is not one of the three levels falls back to 100%", async () => {
    for (const stored of [1.25, 0.5, 3, "big", "2", null, { zoom: 2 }]) {
      const { layer } = setup({ zoom: stored });

      expect(await run(layer, (zoom) => zoom.get())).toBe(DEFAULT_ZOOM);
    }
  });

  test("boot applies the stored level to the webview", async () => {
    const { layer } = setup({ zoom: 2 });

    await run(layer, (zoom) => zoom.apply());

    expect(applied).toEqual([2]);
    // `global.css` multiplies every lucide stroke by this: at 200% the glyph
    // doubles but its outline grows by √2 instead of doubling, which is between
    // the two wrong answers (a marker pen, or a hairline).
    expect(iconScale()).toBeCloseTo(1 / Math.SQRT2, 5);
  });

  test("a chosen level is applied, persisted, and read back on the next launch", async () => {
    const { entries, layer } = setup();

    await run(layer, (zoom) => zoom.set(1.5));

    expect(applied).toEqual([1.5]);
    expect(iconScale()).toBeCloseTo(1 / Math.sqrt(1.5), 5);
    expect(entries.get("zoom")).toBe(1.5);
    expect(await run(layer, (zoom) => zoom.get())).toBe(1.5);

    // Next launch: a fresh layer over the same storage.
    const next = makeTestLocalStorage(Object.fromEntries(entries));
    const nextLayer = ZoomLive.pipe(Layer.provide(next.layer));
    expect(await run(nextLayer, (zoom) => zoom.get())).toBe(1.5);
  });

  test("the change is echoed to subscribers", async () => {
    const { layer } = setup({ zoom: 1.5 });

    const first = await run(layer, (zoom) => Stream.runHead(zoom.changes));

    expect(Option.getOrNull(first)).toBe(1.5);
  });

  test("a webview that refuses the scale fails and leaves the preference alone", async () => {
    refused = "zoom tidak diizinkan";
    const { entries, layer } = setup();

    const result = await run(layer, (zoom) => Effect.either(zoom.set(2)));

    expect(result._tag).toBe("Left");
    expect(entries.has("zoom")).toBe(false);
    // The icon strokes must not thin out for a zoom the webview never applied.
    expect(document.documentElement.style.getPropertyValue("--icon-scale")).toBe("");
    expect(await run(layer, (zoom) => zoom.get())).toBe(DEFAULT_ZOOM);
  });

  test("a full storage still zooms this session, and says the write failed", async () => {
    const { entries, state, layer } = setup();
    state.failure = "local storage penuh";

    const result = await run(layer, (zoom) =>
      Effect.gen(function* () {
        const either = yield* Effect.either(zoom.set(2));
        // Same session: the level the webview is at, read back from the service.
        return { either, current: yield* zoom.get() };
      }),
    );

    expect(result.either._tag).toBe("Left");
    expect(applied).toEqual([2]);
    expect(entries.has("zoom")).toBe(false);
    expect(result.current).toBe(2);
  });
});
