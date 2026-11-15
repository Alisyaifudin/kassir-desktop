import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect, Layer } from "effect";

/**
 * Deleting a product must free its gallery files — and only the ones it owns.
 *
 * `refs.sql` stops counting a tombstone on purpose (tombstones stay forever, so a
 * tombstone that owned bytes would mean the catalogue never frees one), which
 * means a product delete that does not release leaves its pictures on disk with
 * nothing naming them. The other half is why it goes through the count at all: a
 * stored name is a hash of its bytes, so one file can be another product's
 * picture, and unlinking it here would blank that row.
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
const { ProductService } = await import(".");
const { ProductLive } = await import("./live");

function setup() {
  const { db, layer } = makeTestDatabase();
  // Two products, three pictures: one product-exclusive, one shared by both.
  db.exec(`
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1), ('p2', 'Teh', '', 1);
    INSERT INTO images (image_id, image_order, image_name, image_mime, product_id, image_updated_at)
      VALUES ('i1', 0, 'own.webp', 'image/webp', 'p1', 1),
             ('i2', 1, 'shared.webp', 'image/webp', 'p1', 1),
             ('i3', 0, 'shared.webp', 'image/webp', 'p2', 1);
  `);
  return { db, layer: ProductLive.pipe(Layer.provide(layer)) };
}

function deleteProduct(layer: ReturnType<typeof setup>["layer"], ids: string[]) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const product = yield* ProductService;
      for (const id of ids) yield* product.delete(id);
    }).pipe(Effect.provide(layer)),
  );
}

describe("the files a deleted product stops naming", () => {
  beforeEach(() => {
    unlinked.length = 0;
  });

  afterAll(() => {
    mock.restore();
  });

  test("it frees its own picture and leaves the shared one alone", async () => {
    const { layer } = setup();

    await deleteProduct(layer, ["p1"]);

    // `shared.webp` is p2's picture too: kept.
    expect(unlinked).toEqual(["own.webp"]);
  });

  test("the last row naming a file is the one that frees it", async () => {
    const { layer } = setup();

    await deleteProduct(layer, ["p1", "p2"]);

    // The count, not the delete, decides — `shared.webp` goes with the second
    // product because only then is nothing left naming it.
    expect(unlinked).toEqual(["own.webp", "shared.webp"]);
  });
});
