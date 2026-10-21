import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { ExtraService } from ".";
import { makeTestDatabase } from "../db/test-support";
import { ExtraLive } from "./live";

/**
 * The charge catalog is read by the POS through `useExtraPresets`, and it is
 * ordered by name in SQL. A write used to re-read the whole table; the narrow
 * path re-reads the one charge and re-sorts locally, so the folded-in order must
 * match what a full re-read would have produced — otherwise the surcharge list
 * shuffles under the cashier's cursor after a rename.
 */
function run<A>(
  layer: Layer.Layer<ExtraService>,
  program: (extra: Context.Tag.Service<typeof ExtraService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const extra = yield* ExtraService;
      return yield* program(extra);
    }).pipe(Effect.provide(layer)),
  );
}

function setup() {
  const { layer } = makeTestDatabase();
  return ExtraLive.pipe(Layer.provide(layer));
}

const charge = (name: string) => ({ name, value: 1000, kind: "number" as const, flag: 0 });

describe("extra catalog after a narrow refresh", () => {
  test("a rename re-sorts the charge into its new place", async () => {
    const layer = setup();
    const names = await run(layer, (extra) =>
      Effect.gen(function* () {
        yield* extra.add(charge("Zakat"));
        const kirim = yield* extra.add(charge("Ongkir"));
        yield* extra.add(charge("Plastik"));
        yield* extra.set.info(kirim, charge("Aksesoris"));
        const items = yield* extra.get.all();
        return items.map((item) => item.name);
      }),
    );
    expect(names).toEqual(["Aksesoris", "Plastik", "Zakat"]);
  });

  test("a delete drops the charge without a full re-read", async () => {
    const layer = setup();
    const names = await run(layer, (extra) =>
      Effect.gen(function* () {
        yield* extra.add(charge("Zakat"));
        const plastik = yield* extra.add(charge("Plastik"));
        yield* extra.delete.byId(plastik);
        const items = yield* extra.get.all();
        return items.map((item) => item.name);
      }),
    );
    expect(names).toEqual(["Zakat"]);
  });
});
