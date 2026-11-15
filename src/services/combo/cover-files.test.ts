import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect, Layer } from "effect";

/**
 * A combo's cover is a file like any other, and dropping it must go through the
 * count.
 *
 * This path is where the sharing bug is easiest to trigger by hand: the cover is
 * picked from the same photos as everything else, so "upload the same picture to a
 * combo and a product" is one picker away — and with content addressing the two
 * rows then name *one* file. An `image.del` on a replaced or deleted cover takes
 * the product's picture with it.
 *
 * `mock.module` is not reliably scoped to this file (oven-sh/bun#31319), so every
 * member of the mock is present and the registration is taken back on the way out.
 */
const unlinked: string[] = [];

mock.module("~/lib/image", () => ({
  image: {
    del: (name: string) => {
      unlinked.push(name);
      return Effect.succeed(undefined);
    },
    load: (name: string) => Effect.succeed(`blob:${name}`),
    save: (_file: File, _fileKey: string, mime: string) => Effect.succeed({ name: "", mime }),
    size: () => Effect.succeed(0),
  },
}));

const { makeTestDatabase } = await import("../db/test-support");
const { ComboService } = await import(".");
const { ComboLive } = await import("./live");

function setup() {
  const { db, layer } = makeTestDatabase();
  db.exec(`
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO listings (
      listing_id, product_id, listing_name, listing_price, listing_unit,
      listing_kind, listing_updated_at
    ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1);
    INSERT INTO images (image_id, image_order, image_name, image_mime, product_id, image_updated_at)
      VALUES ('i1', 0, 'shared.webp', 'image/webp', 'p1', 1);
    INSERT INTO combos (
      combo_id, combo_name, combo_active, combo_cover_name, combo_cover_mime, combo_updated_at
    ) VALUES ('c1', 'Paket', 1, 'shared.webp', 'image/webp', 1),
             ('c2', 'Hemat', 1, 'own.webp', 'image/webp', 1);
  `);
  return { db, layer: ComboLive.pipe(Layer.provide(layer)) };
}

function input(name: string, cover: { name: string; mime: "image/webp" } | null) {
  return {
    name,
    active: true,
    cover,
    components: [{ listingId: "l1", quantity: 1, discounts: [] }],
    extraIds: [],
  };
}

describe("a combo cover that stops being named", () => {
  beforeEach(() => {
    unlinked.length = 0;
  });

  afterAll(() => {
    mock.restore();
  });

  test("replacing a cover other rows share leaves the file", async () => {
    const { layer } = setup();

    await Effect.runPromise(
      Effect.gen(function* () {
        const combo = yield* ComboService;
        yield* combo.set.info("c1", input("Paket", { name: "brand-new.webp", mime: "image/webp" }));
      }).pipe(Effect.provide(layer)),
    );

    // `shared.webp` is still `p1`'s gallery picture.
    expect(unlinked).toEqual([]);
  });

  test("replacing an exclusive cover frees it", async () => {
    const { layer } = setup();

    await Effect.runPromise(
      Effect.gen(function* () {
        const combo = yield* ComboService;
        yield* combo.set.info("c2", input("Hemat", { name: "brand-new.webp", mime: "image/webp" }));
      }).pipe(Effect.provide(layer)),
    );

    expect(unlinked).toEqual(["own.webp"]);
  });

  test("deleting a combo frees a cover nothing else names", async () => {
    const { layer } = setup();

    await Effect.runPromise(
      Effect.gen(function* () {
        const combo = yield* ComboService;
        yield* combo.delete.byId("c2");
      }).pipe(Effect.provide(layer)),
    );

    expect(unlinked).toEqual(["own.webp"]);
  });
});
