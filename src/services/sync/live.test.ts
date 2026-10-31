/**
 * End-to-end sync through the public service, against a mocked backend.
 *
 * `sync.test.ts` proves the loops statement by statement; this file proves the thing
 * an operator actually presses: seed a real SQLite mirror with fake shop data, run
 * `service.sync.run("sync")`, and check that the rows arrived in the backend — and
 * that rows the backend already had arrived in SQLite.
 *
 * Run with:  bun test src/services/sync/live.test.ts
 */
import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { CustomerLive } from "../customer/live";
import { makeTestDatabase } from "../db/test-support";
import { ExtraLive } from "../extra/live";
import { MethodLive } from "../method/live";
import { MoneyLive } from "../money/live";
import { ProductLive } from "../product/live";
import { SocialLive } from "../social/live";
import { makeTestStore } from "../store/test-support";
import { SupplierLive } from "../supplier/live";
import { SyncService } from ".";
import { SyncLive } from "./live";
import { MockBackend } from "./test-backend";
import { SyncTransportService } from "./transport";

/** A store already pointed at a server, which is what enables the run button. */
const CONFIGURED = { "sync.base_url": "https://sync.test", "sync.token": "token" };

function setup(seedStore: Record<string, unknown> = CONFIGURED) {
  const { db, layer: dbLayer } = makeTestDatabase();
  const store = makeTestStore(seedStore);
  const backend = new MockBackend().attachDatabase(db);
  const hidden = Layer.mergeAll(dbLayer, store.layer);

  // The seven services whose refs the sync service refreshes after a merge. Each
  // gets the same `hidden` layer instance, so they share one database handle.
  const domain = Layer.mergeAll(
    ProductLive.pipe(Layer.provide(hidden)),
    CustomerLive.pipe(Layer.provide(hidden)),
    SupplierLive.pipe(Layer.provide(hidden)),
    ExtraLive.pipe(Layer.provide(hidden)),
    MethodLive.pipe(Layer.provide(hidden)),
    MoneyLive.pipe(Layer.provide(hidden)),
    SocialLive.pipe(Layer.provide(hidden)),
  );

  const layer = SyncLive.pipe(
    Layer.provide(hidden),
    Layer.provide(Layer.succeed(SyncTransportService, backend)),
    Layer.provide(domain),
  );

  return { db, layer, backend, store };
}

/** Runs one sync the way the Sinkronisasi button does. */
function runSync(
  layer: ReturnType<typeof setup>["layer"],
  mode: "sync" | "reset" = "sync",
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const sync = yield* SyncService;
      return yield* sync.run(mode);
    }).pipe(Effect.provide(layer)),
  );
}

/** Writes the fake shop data a device would already have on disk. */
function seedLocalMirror(db: ReturnType<typeof setup>["db"]) {
  // Catalog: a product with a listing, an alias, a property, a cover image and a lot.
  db.query(
    "INSERT INTO products (product_id, product_name, product_note, product_flag, product_updated_at) VALUES ('p1', 'Kopi Susu', 'Gula aren', 0, 1000)",
  ).run();
  db.query(
    "INSERT INTO listings (listing_id, product_id, listing_name, listing_price, listing_unit, listing_kind, listing_code, listing_updated_at) VALUES ('l1', 'p1', 'Kopi Susu', 18000, 1, 'retail', 'KOPI01', 1000)",
  ).run();
  db.query(
    "INSERT INTO product_names (product_name_id, product_id, product_name_value, product_name_updated_at) VALUES ('pn1', 'p1', 'Kopi Aren', 1000)",
  ).run();
  db.query(
    "INSERT INTO properties (property_id, product_id, property_key, property_value, property_updated_at) VALUES ('pr1', 'p1', 'origin', 'Gayo', 1000)",
  ).run();
  db.query(
    "INSERT INTO images (image_id, image_order, image_name, image_mime, product_id, image_updated_at) VALUES ('im1', 0, 'im1.webp', 'image/webp', 'p1', 1000)",
  ).run();
  db.query(
    "INSERT INTO stocks (stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at) VALUES ('st1', 'p1', 10, 9000, 1000, 1000)",
  ).run();

  // The journal: one receipt, one sale of the product.
  db.query(
    "INSERT INTO product_events (product_event_id, product_event_created_at, product_event_value, product_event_capital, product_event_note, product_id, stock_id) VALUES ('e1', 1000, -1, 9000, '', 'p1', 'st1')",
  ).run();

  // Contacts and catalogues.
  db.query(
    "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at) VALUES ('c1', 'Ani', '0812', 1000)",
  ).run();
  db.query(
    "INSERT INTO suppliers (supplier_id, supplier_name, supplier_note, supplier_updated_at) VALUES ('sp1', 'Pemasok Kopi', '', 1000)",
  ).run();
  db.query(
    "INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, extra_flag, extra_updated_at) VALUES ('x1', 'Pajak', 11, 'percent', 0, 1000)",
  ).run();
  db.query(
    "INSERT INTO socials (social_id, social_name, social_value, social_updated_at) VALUES ('so1', 'Instagram', '@kassir', 1000)",
  ).run();
  db.query(
    "INSERT INTO pockets (pocket_id, pocket_name, pocket_type, pocket_ordering, pocket_updated_at) VALUES ('pk1', 'Kas Toko', 'absolute', 0, 1000)",
  ).run();
  db.query(
    "INSERT INTO money (money_id, timestamp, money_value, pocket_id, money_note, money_updated_at) VALUES ('m1', 1000, 250000, 'pk1', 'Modal awal', 1000)",
  ).run();

  // A record with all five child arrays.
  db.query(
    `INSERT INTO records (record_id, record_created_at, record_paid_at, record_rounding, record_cashier,
      record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
      record_sub_total, record_total, record_updated_at, record_supplier_id, record_supplier_name)
      VALUES ('r1', 1000, 1000, 0, 'kasir', 'incoming', 18000, '', 0, 'Ani', '0812', 18000, 18000, 1000, NULL, '')`,
  ).run();
  db.query(
    `INSERT INTO record_listings (record_listing_id, record_listing_group_id, record_id, product_event_id,
      product_id, record_listing_name, record_listing_kind, record_listing_unit, record_listing_price,
      record_listing_qty, record_listing_capital, record_listing_total)
      VALUES ('rl1', 'g1', 'r1', 'e1', 'p1', 'Kopi Susu', 'retail', 1, 18000, 1, 9000, 18000)`,
  ).run();
  db.query(
    "INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay) VALUES ('rm1', 'r1', '1000', 18000)",
  ).run();
  db.query(
    "INSERT INTO record_extras (record_extra_id, record_extra_name, record_id, record_extra_value, record_extra_eff, record_extra_kind) VALUES ('rx1', 'Pajak', 'r1', 11, 1782, 'percent')",
  ).run();
  db.query(
    "INSERT INTO record_images (record_image_id, record_image_order, record_image_name, record_image_mime, record_id) VALUES ('ri1', 0, 'ri1.png', 'image/png', 'r1')",
  ).run();
  db.query(
    "INSERT INTO discounts (discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff) VALUES ('d1', 'dg1', 'rl1', 'number', 500, 500)",
  ).run();

  // The commit path stamps the event with its record (§8b deps); the rows above had
  // to be written in FK order, so the back-reference lands last.
  db.query("UPDATE product_events SET record_id = 'r1' WHERE product_event_id = 'e1'").run();
}

describe("sync through the service", () => {
  test("a fresh device uploads its whole mirror to the backend", async () => {
    const { db, layer, backend } = setup();
    seedLocalMirror(db);

    const report = await runSync(layer);

    expect(report.pulled).toBe(0);
    expect(report.pushed).toBeGreaterThan(0);

    // Every entity the app writes reached the backend with its values intact.
    expect(backend.get("product", "p1")).toMatchObject({
      product_id: "p1",
      product_name: "Kopi Susu",
      product_note: "Gula aren",
      product_flag: 0,
    });
    expect(backend.get("listing", "l1")).toMatchObject({ listing_code: "KOPI01", listing_price: 18000 });
    expect(backend.get("product_name", "pn1")).toMatchObject({ product_name_value: "Kopi Aren" });
    expect(backend.get("property", "pr1")).toMatchObject({ property_value: "Gayo" });
    expect(backend.get("image", "im1")).toMatchObject({ image_mime: "image/webp" });
    expect(backend.get("customer", "c1")).toMatchObject({ customer_name: "Ani" });
    expect(backend.get("supplier", "sp1")).toMatchObject({ supplier_name: "Pemasok Kopi" });
    expect(backend.get("extra", "x1")).toMatchObject({ extra_value: 11, extra_kind: "percent" });
    expect(backend.get("social", "so1")).toMatchObject({ social_value: "@kassir" });
    expect(backend.get("pocket", "pk1")).toMatchObject({ pocket_name: "Kas Toko" });
    expect(backend.get("money", "m1")).toMatchObject({ money_value: 250000, pocket_id: "pk1" });
    expect(backend.get("product_event", "e1")).toMatchObject({
      product_event_value: -1,
      product_event_capital: 9000,
      stock_id: "st1",
    });

    // The record travelled as ONE frame with all five child arrays (§5.2).
    const record = backend.aggregate("record", "r1");
    expect(record?.row).toMatchObject({ record_total: 18000, record_mode: "incoming" });
    expect(record?.children?.["record_listings"]).toHaveLength(1);
    expect(record?.children?.["record_methods"]).toHaveLength(1);
    expect(record?.children?.["record_extras"]).toHaveLength(1);
    expect(record?.children?.["record_images"]).toHaveLength(1);
    expect(record?.children?.["discounts"]).toEqual([
      {
        discount_id: "d1",
        discount_group_id: "dg1",
        record_listing_id: "rl1",
        discount_kind: "number",
        discount_value: 500,
        discount_eff: 500,
      },
    ]);
    // The listing's event link survived the round trip even though the event's own
    // `record_id` is written by a trailing statement in the same batch.
    expect(record?.children?.["record_listings"]?.[0]).toMatchObject({
      product_event_id: "e1",
      product_id: "p1",
    });
    expect(backend.get("product_event", "e1")).toMatchObject({ record_id: "r1" });

    // Stored in the wire order of §2.3: products before the record that names them.
    const entities = backend.applied.map((frame) => frame.entity);
    expect(entities.indexOf("product")).toBeLessThan(entities.indexOf("record"));
    expect(entities.indexOf("product_event")).toBeLessThan(entities.indexOf("record"));
  });

  test("nothing is left owed after a successful run", async () => {
    const { db, layer, backend } = setup();
    seedLocalMirror(db);

    await runSync(layer);
    const applied = backend.applied.length;
    // A second run has nothing to pull and nothing to push.
    const second = await runSync(layer);
    expect(second.pulled).toBe(0);
    expect(second.pushed).toBe(0);
    expect(backend.applied.length).toBe(applied);
    expect(backend.sessionCount).toBeGreaterThanOrEqual(1);
  });

  test("rows the backend already holds are merged into SQLite", async () => {
    const { db, layer, backend } = setup();
    backend
      .seed({
        entity: "customer",
        row: {
          customer_id: "c9",
          customer_name: "Dari Server",
          customer_phone: "0899",
          customer_updated_at: 2000,
          customer_deleted_at: null,
        },
      })
      .seed({
        entity: "record",
        row: {
          record_id: "r9",
          record_created_at: 2000,
          record_paid_at: 2000,
          record_rounding: 0,
          record_credit_at: null,
          record_cashier: "kasir",
          record_mode: "incoming",
          record_pay: 9000,
          record_note: "",
          record_fix: 0,
          record_customer_name: "",
          record_customer_phone: "",
          record_sub_total: 9000,
          record_total: 9000,
          record_updated_at: 2000,
          record_deleted_at: null,
          record_supplier_id: null,
          record_supplier_name: "",
          record_flag: 0,
          record_pair_id: null,
        },
        children: {
          record_listings: [],
          record_methods: [
            { record_method_id: "rm9", method_id: "1000", record_method_pay: 9000 },
          ],
          record_extras: [],
          record_images: [],
          discounts: [],
        },
      });

    const report = await runSync(layer);
    expect(report.pulled).toBeGreaterThan(0);

    const customer = db
      .query<{ customer_name: string; customer_sync_at: number | null }, []>(
        "SELECT customer_name, customer_sync_at FROM customers WHERE customer_id = 'c9'",
      )
      .get();
    expect(customer?.customer_name).toBe("Dari Server");
    // Merged rows are marked synced so they are not pushed straight back (§3.1).
    expect(customer?.customer_sync_at).not.toBeNull();

    const methods = db
      .query<{ record_method_id: string }, []>(
        "SELECT record_method_id FROM record_methods WHERE record_id = 'r9'",
      )
      .all();
    expect(methods.map((row) => row.record_method_id)).toEqual(["rm9"]);
  });

  test("a tie goes to the server: the stale payload replaces the local row", async () => {
    const { db, layer, backend } = setup();
    db.query(
      "INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at) VALUES ('c1', 'Nama Lokal', '0812', 1000)",
    ).run();
    // Same clock, different value: §6.2 says the server keeps its copy and the
    // client learns about it through a `stale` ack, not a pull row.
    backend.seed({
      entity: "customer",
      row: {
        customer_id: "c1",
        customer_name: "Nama Server",
        customer_phone: "0812",
        customer_updated_at: 1000,
        customer_deleted_at: null,
      },
    });

    const report = await runSync(layer);
    expect(report.stale).toBe(1);

    const row = db
      .query<{ customer_name: string; customer_sync_at: number | null }, []>(
        "SELECT customer_name, customer_sync_at FROM customers WHERE customer_id = 'c1'",
      )
      .get();
    expect(row?.customer_name).toBe("Nama Server");
    expect(row?.customer_sync_at).not.toBeNull();
    expect(backend.get("customer", "c1")).toMatchObject({ customer_name: "Nama Server" });
  });

  test("the pull cursor is persisted, so the next run starts where this one ended", async () => {
    const { db, layer, backend, store } = setup();
    seedLocalMirror(db);
    backend.seed({
      entity: "social",
      row: {
        social_id: "so9",
        social_name: "WhatsApp",
        social_value: "0812",
        social_updated_at: 2000,
        social_deleted_at: null,
      },
    });

    await runSync(layer);

    // The pull brought one row (seq 1); the push then appended this device's rows
    // contiguously from that snapshot, so §5.3 lets the cursor jump past them.
    const cursor = store.entries.get("sync.last_pulled_seq");
    expect(typeof cursor).toBe("number");
    expect(cursor as number).toBe(backend.snapshot);
    expect(backend.pulls).toBeGreaterThanOrEqual(1);
    // The upload session is closed out once the push finishes.
    expect(store.entries.get("sync.upload_id")).toBeUndefined();
  });

  test("a second device receives the first device's mirror over the same backend", async () => {
    // Device A: a shop with history, synced up.
    const deviceA = setup();
    seedLocalMirror(deviceA.db);
    await runSync(deviceA.layer);
    expect(deviceA.backend.count("record")).toBe(1);

    // Device B: the same empty backend, nothing else.
    const deviceB = setup();
    deviceB.backend.wipe();
    // Copy A's mirror into B's server, in the order the protocol would emit it.
    for (const aggregate of deviceA.backend.rows("product")) deviceB.backend.seed(aggregate);
    for (const aggregate of deviceA.backend.rows("listing")) deviceB.backend.seed(aggregate);
    for (const aggregate of deviceA.backend.rows("customer")) deviceB.backend.seed(aggregate);
    for (const aggregate of deviceA.backend.rows("product_event")) deviceB.backend.seed(aggregate);
    for (const aggregate of deviceA.backend.rows("record")) deviceB.backend.seed(aggregate);

    await runSync(deviceB.layer);

    // B now holds what A sold: the product, its listing, the customer, the journal
    // entry and the record — including all five child arrays, rebuilt from one frame.
    const product = deviceB.db
      .query<{ product_name: string }, []>(
        "SELECT product_name FROM products WHERE product_id = 'p1'",
      )
      .get();
    expect(product?.product_name).toBe("Kopi Susu");
    const listing = deviceB.db
      .query<{ listing_code: string }, []>("SELECT listing_code FROM listings WHERE listing_id = 'l1'")
      .get();
    expect(listing?.listing_code).toBe("KOPI01");
    const customer = deviceB.db
      .query<{ customer_name: string }, []>(
        "SELECT customer_name FROM customers WHERE customer_id = 'c1'",
      )
      .get();
    expect(customer?.customer_name).toBe("Ani");
    const event = deviceB.db
      .query<{ product_event_value: number; record_id: string | null }, []>(
        "SELECT product_event_value, record_id FROM product_events WHERE product_event_id = 'e1'",
      )
      .get();
    // The event arrived before its record (§2.3), so its link was written by the
    // merge's trailing UPDATE, inside the same transaction.
    expect(event).toEqual({ product_event_value: -1, record_id: "r1" });
    const method = deviceB.db
      .query<{ record_method_pay: number }, []>(
        "SELECT record_method_pay FROM record_methods WHERE record_id = 'r1'",
      )
      .get();
    expect(method?.record_method_pay).toBe(18000);
    const discount = deviceB.db
      .query<{ discount_value: number }, []>("SELECT discount_value FROM discounts WHERE discount_id = 'd1'")
      .get();
    expect(discount?.discount_value).toBe(500);

    // And nothing was pushed back: everything it received is marked synced.
    expect(deviceB.backend.count("customer")).toBe(1);
  });

  test("Sinkronisasi Ulang re-uploads a backend that lost everything", async () => {
    const { db, layer, backend, store } = setup();
    seedLocalMirror(db);

    await runSync(layer);
    const synced = backend.snapshot;
    expect(synced).toBeGreaterThan(0);
    const cursorAfterFirstRun = store.entries.get("sync.last_pulled_seq") as number;
    expect(cursorAfterFirstRun).toBeGreaterThan(0);

    // A restored server: empty, with no memory of this device — except for one row
    // whose seq (1) is *behind* the cursor the device already reached. It can only
    // arrive if `reset` really put the cursor back to zero.
    backend.wipe();
    backend.seed({
      entity: "social",
      row: {
        social_id: "so9",
        social_name: "WhatsApp",
        social_value: "0899",
        social_updated_at: 3000,
        social_deleted_at: null,
      },
    });

    const report = await runSync(layer, "reset");

    const pulled = db
      .query<{ social_name: string }, []>(
        "SELECT social_name FROM socials WHERE social_id = 'so9'",
      )
      .get();
    expect(pulled?.social_name).toBe("WhatsApp");
    // Everything the device holds was offered again, including rows it had marked
    // synced before the reset.
    expect(report.pushed).toBeGreaterThan(0);
    expect(backend.get("product", "p1")).toMatchObject({ product_name: "Kopi Susu" });
    expect(backend.aggregate("record", "r1")).not.toBeNull();
    expect(backend.snapshot).toBeGreaterThanOrEqual(synced - 1);
  });
});
