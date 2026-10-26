import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestStore } from "../store/test-support";
import { InfoService, type Info } from ".";
import { InfoLive } from "./live";

/**
 * The shop identity printed at the top and foot of every receipt. It is read from
 * `store.json` and cached, so a wrong default or a bad coercion shows up on the
 * receipt, not just in Settings — and a store.json written by an older version (or
 * edited by hand) must still produce a printable header.
 */
function setup(seed: Record<string, unknown> = {}) {
  const store = makeTestStore(seed);
  return { entries: store.entries, layer: InfoLive.pipe(Layer.provide(store.layer)) };
}

function run<A>(
  layer: Layer.Layer<InfoService>,
  program: (info: Context.Tag.Service<typeof InfoService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const info = yield* InfoService;
      return yield* program(info);
    }).pipe(Effect.provide(layer)),
  );
}

describe("InfoService", () => {
  test("an empty store prints the placeholder shop name and nothing else", async () => {
    const { layer } = setup();
    const result = await run(layer, (info) =>
      Effect.gen(function* () {
        return { info: yield* info.info(), name: yield* info.name() };
      }),
    );

    expect(result.name).toBe("Toko");
    expect(result.info).toEqual({
      name: "Toko",
      owner: "",
      address: "",
      footer: "",
      header: "",
      showCashier: false,
    });
  });

  test("saving writes one key per field", async () => {
    const { entries, layer } = setup();
    const saved: Info = {
      name: "Warung Bu Tini",
      owner: "Bu Tini",
      address: "Jl. Merdeka 1",
      footer: "Terima kasih",
      header: "Warung Bu Tini\nJl. Merdeka 1",
      showCashier: true,
    };

    await run(layer, (info) => info.set(saved));

    // The keys are what the next launch reads; `showCashier` is dashed.
    expect(entries.get("name")).toBe("Warung Bu Tini");
    expect(entries.get("owner")).toBe("Bu Tini");
    expect(entries.get("address")).toBe("Jl. Merdeka 1");
    expect(entries.get("footer")).toBe("Terima kasih");
    expect(entries.get("header")).toBe("Warung Bu Tini\nJl. Merdeka 1");
    expect(entries.get("show-cashier")).toBe(true);
    expect(await run(layer, (info) => info.info())).toEqual(saved);
  });

  test("a stored shop is hydrated instead of the default", async () => {
    const { layer } = setup({ name: "Warung Bu Tini", "show-cashier": true });

    const info = await run(layer, (info) => info.info());

    expect(info.name).toBe("Warung Bu Tini");
    expect(info.showCashier).toBe(true);
  });

  test("values a hand-edited store.json can carry fall back to something printable", async () => {
    const { layer } = setup({
      name: 42,
      owner: null,
      address: { line: "Jl. Merdeka" },
      // The old boolean was stored as text; `1`/`"false"` are not "true".
      "show-cashier": "true",
    });

    const info = await run(layer, (info) => info.info());

    expect(info.name).toBe("Toko");
    expect(info.owner).toBe("");
    expect(info.address).toBe("");
    expect(info.showCashier).toBe(true);
    expect(await run(layer, (info) => info.name())).toBe("Toko");
  });

  test("`showCashier` is only true for the values the writer actually saves", async () => {
    const truthy = await run(setup({ "show-cashier": 1 }).layer, (info) => info.info());
    const falsy = await run(setup({ "show-cashier": "false" }).layer, (info) => info.info());
    expect(truthy.showCashier).toBe(false);
    expect(falsy.showCashier).toBe(false);
  });

  test("`changes` hydrates from the store on first subscribe", async () => {
    const { layer } = setup({ name: "Warung Bu Tini" });

    const head = await run(layer, (info) => Stream.runHead(info.changes));

    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value.name).toBe("Warung Bu Tini");
  });
});
