import { describe, expect, mock, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { ImageService } from ".";
import { makeTestDatabase } from "../db/test-support";
import { ImageLive } from "./live";

/**
 * The release gate: a stored image may only be unlinked when no row names it.
 *
 * The rule exists because a name can appear in four tables at once — the product
 * gallery, the pictures attached to a cart, the ones a submitted record keeps,
 * and a combo cover — and the optimizer makes several rows of one table share a
 * name too. The tests below pin the count across all four, and pin that a
 * soft-deleted row stops owning its file (a tombstone that owned bytes would mean
 * the catalogue never frees one).
 *
 * What is asserted here is the **decision** — the count, and whether `release`
 * answered `kept` or `deleted` — not the path the unlink wrote. A `mock.module`
 * registration is not scoped to the file that made it (`~/hooks/use-image.test.tsx`
 * documents the same trap), and three component tests stub `~/lib/image` for the
 * whole process: under a full `bun test` run the unlink here may well be *their*
 * stub, so a recorder in this file would fail on load order rather than on
 * behaviour. The unlink itself is covered where it lives, in `lib/image.test.ts`.
 */
mock.module("@tauri-apps/plugin-fs", () => ({
  BaseDirectory: { AppData: 1 },
  remove: async () => {},
}));

mock.module("@tauri-apps/api/path", () => ({
  join: async (...parts: string[]) => parts.join("/"),
}));

function run<A>(
  layer: Layer.Layer<ImageService>,
  program: (image: Context.Tag.Service<typeof ImageService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const image = yield* ImageService;
      return yield* program(image);
    }).pipe(Effect.provide(layer)),
  );
}

function setup() {
  const { db, layer } = makeTestDatabase();
  db.query(
    `INSERT INTO products (product_id, product_name, product_note, product_updated_at, product_sync_at, product_deleted_at, product_flag)
     VALUES ('p1', 'Mangkok', '', 1, NULL, NULL, 0), ('p2', 'Sisir', '', 1, NULL, NULL, 0)`,
  ).run();
  return { db, layer: ImageLive.pipe(Layer.provide(layer)) };
}

type Db = ReturnType<typeof setup>["db"];

function image(db: Db, id: string, name: string, product = "p1", deletedAt: number | null = null) {
  db.query(
    `INSERT INTO images (
        image_id, image_order, image_name, image_mime, product_id,
        image_updated_at, image_sync_at, image_deleted_at,
        image_blob_version, image_blob_sha256, image_blob_sync_at
      ) VALUES ($1, 0, $2, 'image/webp', $3, 1, NULL, $4, 1, NULL, NULL)`,
  ).run(id, name, product, deletedAt);
}

function record(db: Db, id: string, name: string) {
  db.query(
    `INSERT INTO records (
        record_id, record_created_at, record_rounding, record_cashier, record_mode,
        record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
        record_sub_total, record_total, record_updated_at
      ) VALUES ($1, 1, 0, 'kasir', 'incoming', 0, '', 0, '', '', 0, 0, 1)`,
  ).run(id);
  db.query(
    `INSERT INTO record_images (record_image_id, record_image_order, record_image_name, record_image_mime, record_id)
     VALUES ($1, 0, $2, 'image/webp', $3)`,
  ).run(`ri-${id}`, name, id);
}

function cart(db: Db, id: string, name: string) {
  db.query(
    `INSERT INTO tx_records (tx_record_id, tx_record_order, tx_record_title) VALUES ($1, 0, '')`,
  ).run(id);
  db.query(
    `INSERT INTO tx_images (tx_image_id, tx_image_order, tx_image_name, tx_image_mime, tx_record_id)
     VALUES ($1, 0, $2, 'image/webp', $3)`,
  ).run(`ti-${id}`, name, id);
}

function combo(db: Db, id: string, name: string, deletedAt: number | null = null) {
  db.query(
    `INSERT INTO combos (combo_id, combo_name, combo_active, combo_cover_name, combo_cover_mime, combo_updated_at, combo_sync_at, combo_deleted_at)
     VALUES ($1, $2, 1, $3, 'image/webp', 1, NULL, $4)`,
  ).run(id, id, name, deletedAt);
}

describe("image release", () => {
  test("no row names it, so the file may go", async () => {
    const { layer } = setup();

    expect(await run(layer, (image) => image.refs("orphan.webp"))).toBe(0);
    expect(await run(layer, (image) => image.release("orphan.webp"))).toBe("deleted");
  });

  test("keeps a file the gallery still names in another product", async () => {
    const { db, layer } = setup();
    image(db, "i1", "shared.webp", "p1");
    image(db, "i2", "shared.webp", "p2");

    const refs = await run(layer, (image) => image.refs("shared.webp"));
    const released = await run(layer, (image) => image.release("shared.webp"));

    expect(refs).toBe(2);
    expect(released).toBe("kept");
  });

  test("a sold record keeps its picture even after the product photo is gone", async () => {
    const { db, layer } = setup();
    record(db, "r1", "receipt.webp");
    image(db, "i1", "receipt.webp", "p1", 99);

    const released = await run(layer, (image) => image.release("receipt.webp"));

    expect(released).toBe("kept");
  });

  test("an open cart's picture is counted", async () => {
    const { db, layer } = setup();
    cart(db, "t1", "cart.webp");

    expect(await run(layer, (image) => image.refs("cart.webp"))).toBe(1);
  });

  test("a combo cover is counted", async () => {
    const { db, layer } = setup();
    combo(db, "c1", "cover.webp");

    expect(await run(layer, (image) => image.refs("cover.webp"))).toBe(1);
  });

  test("a soft-deleted row or combo stops owning its file", async () => {
    const { db, layer } = setup();
    image(db, "i1", "gone.webp", "p1", 99);
    combo(db, "c1", "gone.webp", 99);

    expect(await run(layer, (image) => image.refs("gone.webp"))).toBe(0);
    expect(await run(layer, (image) => image.release("gone.webp"))).toBe("deleted");
  });

  test("names are matched exactly, never by prefix or case", async () => {
    const { db, layer } = setup();
    image(db, "i1", "abc-photo.webp", "p1");

    expect(await run(layer, (image) => image.refs("abc.webp"))).toBe(0);
    expect(await run(layer, (image) => image.refs("ABC-PHOTO.webp"))).toBe(0);
    expect(await run(layer, (image) => image.refs("abc-photo.webp"))).toBe(1);
  });
});
