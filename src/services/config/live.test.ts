import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestLocalStorage } from "../local-storage/test-support";
import { ConfigService } from ".";
import { ConfigLive } from "./live";

/**
 * The UI size lives in localStorage. `changes` replays the hydrated value first,
 * so a stored size has to be read before the first subscriber arrives — otherwise
 * the app paints at the default size and snaps a moment later.
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

describe("ConfigService", () => {
  test("with nothing stored the app opens big", async () => {
    const { layer } = setup();
    expect(await run(layer, (config) => config.size.get())).toBe("big");
  });

  test("a stored size is what the first subscriber sees", async () => {
    const { layer } = setup({ size: "small" });

    const head = await run(layer, (config) =>
      Effect.gen(function* () {
        return { get: yield* config.size.get(), stream: yield* Stream.runHead(config.size.changes) };
      }),
    );

    expect(head.get).toBe("small");
    expect(head.stream._tag).toBe("Some");
    if (head.stream._tag === "Some") expect(head.stream.value).toBe("small");
  });

  test("a stored value that is not a size falls back to big", async () => {
    for (const stored of ["medium", 42, null, { size: "small" }]) {
      const { layer } = setup({ size: stored });
      expect(await run(layer, (config) => config.size.get())).toBe("big");
    }
  });

  test("a size change is persisted and pushed to subscribers", async () => {
    const { entries, layer } = setup();

    const head = await run(layer, (config) =>
      Effect.gen(function* () {
        yield* config.size.set("small");
        return yield* Stream.runHead(config.size.changes);
      }),
    );

    expect(entries.get("size")).toBe("small");
    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value).toBe("small");
    // And the next launch starts small.
    expect(await run(layer, (config) => config.size.get())).toBe("small");
  });

  test("a storage that refuses to be read is a default, not a crash", async () => {
    const { state, layer } = setup();
    state.failure = "local storage penuh";

    expect(await run(layer, (config) => config.size.get())).toBe("big");
  });

  test("a storage that refuses to be written surfaces a ConfigError", async () => {
    const { state, layer } = setup();

    const result = await run(layer, (config) =>
      Effect.gen(function* () {
        state.failure = "local storage penuh";
        return yield* Effect.either(config.size.set("small"));
      }),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("ConfigError");
      expect(result.left.message).toBe("local storage penuh");
    }
  });
});
