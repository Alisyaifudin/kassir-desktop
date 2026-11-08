import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { ComboService, type ComboInput } from ".";
import { makeTestDatabase } from "../db/test-support";
import { ComboLive } from "./live";

function run<A>(
  layer: Layer.Layer<ComboService>,
  program: (combo: Context.Tag.Service<typeof ComboService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const combo = yield* ComboService;
      return yield* program(combo);
    }).pipe(Effect.provide(layer)),
  );
}

function setup() {
  const { db, layer } = makeTestDatabase();
  db.query(
    `INSERT INTO products (product_id, product_name, product_note, product_updated_at, product_sync_at, product_deleted_at, product_flag)
     VALUES ('p1', 'Mangkok', '', 1, NULL, NULL, 0), ('p2', 'Sisir', '', 1, NULL, NULL, 0)`,
  ).run();
  db.query(
    `INSERT INTO listings (listing_id, product_id, listing_name, listing_price, listing_unit, listing_kind, listing_code, listing_updated_at, listing_sync_at, listing_deleted_at)
     VALUES ('l1', 'p1', 'Mangkok 1 pcs', 2500, 1, '', NULL, 1, NULL, NULL),
            ('l2', 'p2', 'Sisir 1 pcs', 1500, 1, '', NULL, 1, NULL, NULL)`,
  ).run();
  db.query(
    `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, extra_flag, extra_updated_at, extra_sync_at, extra_deleted_at)
     VALUES ('e1', 'Diskon combo', -1000, 'number', 0, 1, NULL, NULL)`,
  ).run();
  return ComboLive.pipe(Layer.provide(layer));
}

const input: ComboInput = {
  name: "Paket hemat",
  active: true,
  cover: null,
  components: [
    { listingId: "l1", quantity: 1, discounts: [] },
    { listingId: "l2", quantity: 2, discounts: [{ value: 10, kind: "percent" }] },
  ],
  extraIds: ["e1"],
};

describe("combo catalog", () => {
  test("writes and reads ordered listing and Extra references", async () => {
    const layer = setup();
    const combo = await run(layer, (service) =>
      Effect.gen(function* () {
        const id = yield* service.add(input);
        return (yield* service.get.all()).find((item) => item.id === id);
      }),
    );
    expect(combo).toMatchObject({
      name: "Paket hemat",
      active: true,
      components: [
        { listingId: "l1", quantity: 1, order: 0, discounts: [] },
        {
          listingId: "l2",
          quantity: 2,
          order: 1,
          discounts: [{ value: 10, kind: "percent", order: 0 }],
        },
      ],
      extras: [{ extraId: "e1", order: 0 }],
    });
  });

  test("updates the whole template and soft-deletes it", async () => {
    const layer = setup();
    const result = await run(layer, (service) =>
      Effect.gen(function* () {
        const id = yield* service.add(input);
        yield* service.set.info(id, {
          ...input,
          name: "Paket sisir",
          active: false,
          components: [{ listingId: "l2", quantity: 3, discounts: [{ value: 250, kind: "number" }] }],
          extraIds: [],
        });
        const updated = (yield* service.get.all()).find((item) => item.id === id);
        yield* service.delete.byId(id);
        return { updated, afterDelete: yield* service.get.all() };
      }),
    );
    expect(result.updated).toMatchObject({
      name: "Paket sisir",
      active: false,
      components: [
        { listingId: "l2", quantity: 3, discounts: [{ value: 250, kind: "number", order: 0 }] },
      ],
      extras: [],
    });
    expect(result.afterDelete).toEqual([]);
  });

  test("rejects missing or unpublished listing references instead of saving a broken combo", async () => {
    const layer = setup();
    const error = await run(layer, (service) =>
      Effect.gen(function* () {
        return yield* Effect.flip(
          service.add({ ...input, components: [{ listingId: "missing", quantity: 1, discounts: [] }] }),
        );
      }),
    );
    expect(error._tag).toBe("ComboError");
  });

  test("rejects duplicate names case-insensitively", async () => {
    const layer = setup();
    const error = await run(layer, (service) =>
      Effect.gen(function* () {
        yield* service.add(input);
        return yield* Effect.flip(service.add({ ...input, name: "PAKET HEMAT" }));
      }),
    );
    expect(error._tag).toBe("ComboError");
    if (error._tag === "ComboError") expect(error.message).toBe("Nama combo sudah digunakan.");
  });
});
