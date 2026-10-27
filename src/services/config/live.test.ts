import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { makeTestLocalStorage } from "../local-storage/test-support";
import { ConfigService } from ".";
import { ConfigLive } from "./live";

/**
 * The config service reads its preferences from localStorage.
 */
function setup(seed: Record<string, unknown> = {}) {
  const storage = makeTestLocalStorage(seed);
  return {
    entries: storage.entries,
    state: storage.state,
    layer: ConfigLive.pipe(Layer.provide(storage.layer)),
  };
}

function run<A>(
  layer: Layer.Layer<ConfigService>,
  program: (config: Context.Tag.Service<typeof ConfigService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const config = yield* ConfigService;
      return yield* program(config);
    }).pipe(Effect.provide(layer)),
  );
}

/**
 * The product list's layout is a preference. Nothing subscribes to it: the URL is the source of truth while the page is open, and
 * this is only what a bare `/products` opens on. Two things matter — a bad or
 * missing stored value is cards, never a crash, and a write to a full/disabled
 * localStorage still leaves this session on the view the operator picked.
 */
describe("ConfigService productView", () => {
  test("with nothing stored the product list opens on cards", async () => {
    const { layer } = setup();

    expect(await run(layer, (config) => config.productView.get())).toBe("grid");
  });

  test("a stored view is what the first read returns", async () => {
    const { layer } = setup({ "product-view": "table" });

    expect(await run(layer, (config) => config.productView.get())).toBe("table");
  });

  test("a stored value that is not a view falls back to cards", async () => {
    for (const stored of ["cards", 42, null, { view: "table" }]) {
      const { layer } = setup({ "product-view": stored });

      expect(await run(layer, (config) => config.productView.get())).toBe("grid");
    }
  });

  test("a view choice is persisted, and the next launch opens on it", async () => {
    const { entries, layer } = setup();

    await run(layer, (config) => config.productView.set("table"));

    expect(entries.get("product-view")).toBe("table");
    expect(await run(layer, (config) => config.productView.get())).toBe("table");
  });

  test("a storage that refuses to be read still opens on cards", async () => {
    const { state, layer } = setup({ "product-view": "table" });
    state.failure = "local storage penuh";

    expect(await run(layer, (config) => config.productView.get())).toBe("grid");
  });

  test("a failed write surfaces a ConfigError but keeps the view this session", async () => {
    const { state, layer } = setup();

    const result = await run(layer, (config) =>
      Effect.gen(function* () {
        state.failure = "local storage penuh";
        const written = yield* Effect.either(config.productView.set("table"));
        return { written, view: yield* config.productView.get() };
      }),
    );

    expect(result.written._tag).toBe("Left");
    if (result.written._tag === "Left") {
      expect(result.written.left._tag).toBe("ConfigError");
      expect(result.written.left.message).toBe("local storage penuh");
    }
    expect(result.view).toBe("table");
  });
});
