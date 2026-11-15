import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect, Layer } from "effect";

/**
 * Voiding a sale frees its pictures — the last member of the delete family, and
 * the only one whose tombstone lives on a parent.
 *
 * `refs.sql` joins `records`, so once the sale is tombstoned nothing in
 * `record_images` owns its file any more. Without a release here that file sits on
 * disk with nothing naming it and no count that will ever reach it: an ordinary
 * product photo shared with a voided receipt could never be freed, because the
 * receipt's row kept the count above zero forever.
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
const { ProductLive } = await import("../product/live");
const { RecordService } = await import(".");
const { RecordLive } = await import("./live");

function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));

  db.exec(`
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO images (image_id, image_order, image_name, image_mime, product_id, image_updated_at)
      VALUES ('i1', 0, 'shared.webp', 'image/webp', 'p1', 1);
    INSERT INTO records (
      record_id, record_created_at, record_rounding, record_cashier, record_mode,
      record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
      record_sub_total, record_total, record_updated_at
    ) VALUES ('r1', 1, 0, 'kasir', 'incoming', 0, '', 0, '', '', 0, 0, 1);
    INSERT INTO record_images (record_image_id, record_image_order, record_image_name, record_image_mime, record_id)
      VALUES ('ri1', 0, 'shared.webp', 'image/webp', 'r1'),
             ('ri2', 1, 'receipt-only.webp', 'image/webp', 'r1');
  `);

  return { db, layer: recordLayer };
}

function voidRecord(layer: ReturnType<typeof setup>["layer"], id: string) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      yield* record.delete.byId(id);
    }).pipe(Effect.provide(layer)),
  );
}

describe("the files a voided sale stops naming", () => {
  beforeEach(() => {
    unlinked.length = 0;
  });

  afterAll(() => {
    mock.restore();
  });

  test("a receipt photo nothing else names is freed", async () => {
    const { layer } = setup();

    await voidRecord(layer, "r1");

    // `shared.webp` is still the product's picture: kept. `receipt-only.webp`
    // belonged to the sale, which is now a tombstone.
    expect(unlinked).toEqual(["receipt-only.webp"]);
  });

  test("voiding twice unlinks nothing, because the second call is a no-op", async () => {
    const { layer } = setup();

    await voidRecord(layer, "r1");
    unlinked.length = 0;
    await voidRecord(layer, "r1");

    expect(unlinked).toEqual([]);
  });
});
