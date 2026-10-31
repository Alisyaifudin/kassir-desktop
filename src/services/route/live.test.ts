import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { makeTestLocalStorage } from "../local-storage/test-support";
import { RouteService } from ".";
import { RouteLive } from "./live";
import type { RouteStack } from "./stack";

const STACK_KEY = "route-stack";

/**
 * The stack service: what it reads back, what it writes, and the one thing it must
 * never do — fail a navigation because a preference could not be saved.
 */
function setup(seed: Record<string, unknown> = {}) {
  const storage = makeTestLocalStorage(seed);
  return {
    entries: storage.entries,
    state: storage.state,
    layer: RouteLive.pipe(Layer.provide(storage.layer)),
  };
}

function run<A>(
  layer: Layer.Layer<RouteService>,
  program: (route: Context.Tag.Service<typeof RouteService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const route = yield* RouteService;
      return yield* program(route);
    }).pipe(Effect.provide(layer)),
  );
}

const urlsOf = (stack: RouteStack) => stack.map((item) => item.url);

describe("RouteService", () => {
  test("a stack from the previous session is where the app starts", async () => {
    const { layer } = setup({
      [STACK_KEY]: [
        { url: "/", key: "a" },
        { url: "/products?q=teh", key: "b" },
      ],
    });

    const stack = await run(layer, (route) => route.get());

    expect(urlsOf(stack)).toEqual(["/", "/products?q=teh"]);
  });

  test("with nothing stored there is nothing behind the first screen", async () => {
    const { layer } = setup();

    expect(await run(layer, (route) => route.get())).toEqual([]);
    expect(await run(layer, (route) => route.back())).toBeNull();
  });

  test("a committed location is remembered and persisted", async () => {
    const { layer, entries } = setup();

    const stack = await run(layer, (route) =>
      Effect.gen(function* () {
        yield* route.commit({ url: "/", key: "a" });
        yield* route.commit({ url: "/products", key: "b" });
        return yield* route.get();
      }),
    );

    expect(urlsOf(stack)).toEqual(["/", "/products"]);
    expect(entries.get(STACK_KEY)).toEqual([
      { url: "/", key: "a" },
      { url: "/products", key: "b" },
    ]);
  });

  test("an announced intent is what the commit records, not the raw URL", async () => {
    const { layer } = setup({ [STACK_KEY]: [{ url: "/products", key: "a" }] });

    const stack = await run(layer, (route) =>
      Effect.gen(function* () {
        yield* route.intend("/products?q=teh", "replace");
        yield* route.commit({ url: "/products?q=teh", key: "b" });
        return yield* route.get();
      }),
    );

    // A facet written with `replace` is the same screen, so it leaves one entry.
    expect(urlsOf(stack)).toEqual(["/products?q=teh"]);
  });

  test("back names the screen below and shorts the stack on arrival", async () => {
    const { layer } = setup({
      [STACK_KEY]: [
        { url: "/products?q=teh", key: "a" },
        { url: "/products/1", key: "b" },
      ],
    });

    // One run: `Effect.provide` builds the layer, so the stack has to be walked
    // in a single session the way the app walks it.
    const { target, stack } = await run(layer, (route) =>
      Effect.gen(function* () {
        const target = yield* route.back();
        yield* route.commit({ url: "/products?q=teh", key: "c" });
        return { target, stack: yield* route.get() };
      }),
    );

    expect(target).toBe("/products?q=teh");
    expect(urlsOf(stack)).toEqual(["/products?q=teh"]);
  });

  test("an intent that never lands is forgotten at the next commit", async () => {
    const { layer } = setup({ [STACK_KEY]: [{ url: "/products", key: "a" }] });

    const stack = await run(layer, (route) =>
      Effect.gen(function* () {
        // Announced, then refused by a blocker: the location never changed.
        yield* route.intend("/products/1", "push");
        // Something else lands instead.
        yield* route.commit({ url: "/records", key: "b" });
        // A later navigation to the announced URL must not become the old push.
        yield* route.commit({ url: "/products/1", key: "c" });
        return yield* route.get();
      }),
    );

    expect(urlsOf(stack)).toEqual(["/products", "/records", "/products/1"]);
  });

  test("a refused localStorage write keeps the session's stack", async () => {
    const { layer, state } = setup({ [STACK_KEY]: [{ url: "/", key: "a" }] });

    const stack = await run(layer, (route) =>
      Effect.gen(function* () {
        // Hydration reads the seeded stack first; the store only fails once the
        // session is already running, which is the case this guards.
        state.failure = "Kuota localStorage penuh";
        yield* route.commit({ url: "/products", key: "b" });
        yield* route.back();
        yield* route.commit({ url: "/", key: "c" });
        return yield* route.get();
      }),
    );

    // Back still works, and the screen it returned to is the one showing: the write
    // is a convenience for the next launch, not a condition of navigating.
    expect(urlsOf(stack)).toEqual(["/"]);
  });

  test("reset forgets every screen behind the one it names", async () => {
    const { layer, entries } = setup({
      [STACK_KEY]: [
        { url: "/products", key: "a" },
        { url: "/products/1", key: "b" },
      ],
    });

    const stack = await run(layer, (route) =>
      Effect.gen(function* () {
        yield* route.reset("/login");
        return yield* route.get();
      }),
    );

    expect(urlsOf(stack)).toEqual(["/login"]);
    expect(entries.get(STACK_KEY)).toEqual([{ url: "/login", key: "reset" }]);
  });
});
