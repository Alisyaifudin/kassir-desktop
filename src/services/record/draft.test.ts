import { describe, expect, test } from "bun:test";
import { Effect, Either, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "./live";
import { RecordError, RecordService, type RecordDraftInput } from ".";

function setup() {
  const { db, layer } = makeTestDatabase();

  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));

  function seed() {
    db.exec(`
      INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
        VALUES ('cash', 'Tunai', 'cash', 1);
      INSERT INTO products (product_id, product_name, product_note, product_updated_at)
        VALUES ('p1', 'Kopi', '', 1);
      INSERT INTO listings (
        listing_id, product_id, listing_name, listing_price, listing_unit,
        listing_kind, listing_updated_at
      ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1);
      INSERT INTO stocks (
        stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
      ) VALUES ('s1', 'p1', 2, 1000, 1, 1), ('s2', 'p1', 5, 2000, 2, 2);
      INSERT INTO tx_records (
        tx_record_id, tx_record_order, tx_record_flag, tx_record_title, tx_record_mode
      ) VALUES ('d1', 0, 0, 'Kopi', 'incoming');
      INSERT INTO tx_listings (
        tx_listing_id, tx_record_id, listing_id, tx_listing_name,
        tx_listing_price, tx_listing_unit, tx_listing_qty
      ) VALUES ('tl1', 'd1', 'l1', 'Kopi', 10000, 1, 4);
    `);
  }

  return { db, recordLayer, seed };
}

function input(overrides: Partial<RecordDraftInput> = {}): RecordDraftInput {
  return {
    draftId: "d1",
    paidAt: 10,
    creditAt: null,
    rounding: 0,
    cashier: "Kasir",
    mode: "incoming",
    pay: 40000,
    note: "",
    fix: 0,
    customer: { id: null, name: "Budi", phone: "0812" },
    supplier: { id: null, name: "" },
    subTotal: 40000,
    total: 40000,
    methods: [{ methodId: "cash", pay: 40000 }],
    listings: [
      {
        listingId: "l1",
        name: "Kopi",
        code: "",
        kind: "retail",
        unit: 1,
        price: 10000,
        qty: 4,
        discounts: [],
      },
    ],
    extras: [],
    images: [],
    ...overrides,
  };
}

function runDraft(recordLayer: Layer.Layer<RecordService>, data: RecordDraftInput) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* record.add.draft(data);
    }).pipe(Effect.provide(recordLayer)),
  );
}

describe("RecordService.add.draft (incoming)", () => {
  test("drains lots oldest-first and splits the line into portions", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    const recordId = await runDraft(recordLayer, input());

    const record = db
      .query("SELECT * FROM records WHERE record_id = ?")
      .get(recordId) as Record<string, unknown>;
    expect(record.record_total).toBe(40000);
    expect(record.record_pay).toBe(40000);
    expect(record.record_customer_name).toBe("Budi");
    expect(record.record_customer_phone).toBe("0812");
    expect(record.record_credit_at).toBeNull();

    const portions = db
      .query(
        `SELECT record_listing_qty AS qty, record_listing_capital AS capital,
                record_listing_total AS total, record_listing_price AS price
         FROM record_listings ORDER BY record_listing_capital`,
      )
      .all() as { qty: number; capital: number; total: number; price: number }[];
    expect(portions).toEqual([
      { qty: 2, capital: 1000, total: 20000, price: 10000 },
      { qty: 2, capital: 2000, total: 20000, price: 10000 },
    ]);

    const lots = db
      .query("SELECT stock_id, stock_value FROM stocks ORDER BY stock_id")
      .all() as { stock_id: string; stock_value: number }[];
    expect(lots).toEqual([
      { stock_id: "s1", stock_value: 0 },
      { stock_id: "s2", stock_value: 3 },
    ]);

    const events = db
      .query(
        `SELECT product_event_value AS value, product_event_capital AS capital
         FROM product_events WHERE record_id = ? ORDER BY product_event_created_at, product_event_value`,
      )
      .all(recordId) as { value: number; capital: number }[];
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.value)).toEqual([-2, -2]);
    expect(events.map((event) => event.capital).sort()).toEqual([1000, 2000]);

    const methods = db
      .query("SELECT method_id, record_method_pay FROM record_methods WHERE record_id = ?")
      .all(recordId);
    expect(methods).toEqual([{ method_id: "cash", record_method_pay: 40000 }]);

    const customers = db.query("SELECT customer_name, customer_phone FROM customers").all();
    expect(customers).toEqual([{ customer_name: "Budi", customer_phone: "0812" }]);

    expect(db.query("SELECT COUNT(*) AS n FROM tx_records").get()).toEqual({ n: 0 });
  });

  test("lets the last lot go negative on a shortage", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    db.exec("UPDATE stocks SET stock_value = 1 WHERE stock_id = 's2'");
    await runDraft(recordLayer, input());
    const lots = db
      .query("SELECT stock_id, stock_value FROM stocks ORDER BY stock_id")
      .all() as { stock_id: string; stock_value: number }[];
    expect(lots).toEqual([
      { stock_id: "s1", stock_value: 0 },
      { stock_id: "s2", stock_value: -1 },
    ]);
  });

  test("creates a product, listing and negative lot for a manual line", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    await runDraft(
      recordLayer,
      input({
        pay: 10000,
        subTotal: 10000,
        total: 10000,
        methods: [{ methodId: "cash", pay: 10000 }],
        listings: [
          {
            listingId: null,
            name: "  Barang Baru  ",
            code: " NEW-1 ",
            kind: "retail",
            unit: 1,
            price: 5000,
            qty: 2,
            discounts: [],
          },
        ],
      }),
    );

    const product = db.query("SELECT product_name FROM products WHERE product_id <> 'p1'").get() as {
      product_name: string;
    };
    expect(product.product_name).toBe("Barang Baru");
    const listing = db
      .query("SELECT listing_code FROM listings WHERE listing_id <> 'l1'")
      .get() as { listing_code: string };
    expect(listing).toEqual({ listing_code: "new-1" });
    const lot = db
      .query("SELECT stock_value, stock_capital FROM stocks WHERE product_id <> 'p1'")
      .get() as { stock_value: number; stock_capital: number };
    expect(lot).toEqual({ stock_value: -2, stock_capital: 0 });
  });

  test("refuses two manual lines with the same code", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    const result = await Effect.runPromise(
      Effect.either(
        Effect.gen(function* () {
          const record = yield* RecordService;
          return yield* record.add.draft(
            input({
              listings: [
                {
                  listingId: null,
                  name: "A",
                  code: "abc",
                  kind: "retail",
                  unit: 1,
                  price: 1000,
                  qty: 1,
                  discounts: [],
                },
                {
                  listingId: null,
                  name: "B",
                  code: "ABC",
                  kind: "retail",
                  unit: 1,
                  price: 1000,
                  qty: 1,
                  discounts: [],
                },
              ],
            }),
          );
        }).pipe(Effect.provide(recordLayer)),
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left).toBeInstanceOf(RecordError);
    expect(db.query("SELECT COUNT(*) AS n FROM records").get()).toEqual({ n: 0 });
  });

  test("refuses a manual code that a catalogue listing already owns", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    db.exec("UPDATE listings SET listing_code = 'abc' WHERE listing_id = 'l1'");
    const result = await Effect.runPromise(
      Effect.either(
        Effect.gen(function* () {
          const record = yield* RecordService;
          return yield* record.add.draft(
            input({
              listings: [
                {
                  listingId: null,
                  name: "Baru",
                  code: "ABC",
                  kind: "retail",
                  unit: 1,
                  price: 1000,
                  qty: 1,
                  discounts: [],
                },
              ],
              pay: 1000,
              subTotal: 1000,
              total: 1000,
              methods: [{ methodId: "cash", pay: 1000 }],
            }),
          );
        }).pipe(Effect.provide(recordLayer)),
      ),
    );
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left).toBeInstanceOf(RecordError);
    expect(db.query("SELECT COUNT(*) AS n FROM records").get()).toEqual({ n: 0 });
  });

  test("treats a vanished catalog listing as a no-stock line", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    db.exec("UPDATE listings SET listing_deleted_at = 1 WHERE listing_id = 'l1'");
    await runDraft(recordLayer, input());
    const portion = db
      .query("SELECT product_id, product_event_id FROM record_listings")
      .get() as { product_id: string | null; product_event_id: string | null };
    expect(portion).toEqual({ product_id: null, product_event_id: null });
    const lots = db.query("SELECT stock_value FROM stocks ORDER BY stock_id").all();
    expect(lots).toEqual([{ stock_value: 2 }, { stock_value: 5 }]);
  });
});


// ---------------------------------------------------------------------------
// Direct entry points the public submit cannot reach
// ---------------------------------------------------------------------------

type ManualLine = {
  listingId: null;
  name: string;
  code: string;
  kind: string;
  unit: number;
  price: number;
  qty: number;
  discounts: never[];
};

function manual(overrides: Partial<ManualLine> = {}): ManualLine {
  return {
    listingId: null,
    name: "Baru",
    code: "",
    kind: "retail",
    unit: 1,
    price: 1000,
    qty: 1,
    discounts: [],
    ...overrides,
  };
}

function runDraftEither(recordLayer: Layer.Layer<RecordService>, data: RecordDraftInput) {
  return Effect.runPromise(
    Effect.either(
      Effect.gen(function* () {
        const record = yield* RecordService;
        return yield* record.add.draft(data);
      }).pipe(Effect.provide(recordLayer)),
    ),
  );
}

function expectRecordError(
  result: Either.Either<string, RecordError>,
  contains: string,
) {
  expect(result._tag).toBe("Left");
  if (result._tag === "Left") expect(result.left.message).toContain(contains);
}


describe("RecordService.add.draft (outcoming)", () => {
  test("allocates extras and rounding into the lot capital", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    const recordId = await runDraft(
      recordLayer,
      input({
        mode: "outcoming",
        total: 44000,
        pay: 44000,
        extras: [{ name: "Ongkir", value: 4000, eff: 4000, kind: "number", flag: 0 }],
      }),
    );

    const portion = db
      .query(
        `SELECT record_listing_total AS total, record_listing_capital AS capital
         FROM record_listings WHERE record_id = ?`,
      )
      .get(recordId) as { total: number; capital: number };
    expect(portion).toEqual({ total: 40000, capital: 11000 });

    const event = db
      .query(
        "SELECT product_event_value AS value, product_event_capital AS capital FROM product_events WHERE record_id = ?",
      )
      .get(recordId) as { value: number; capital: number };
    expect(event).toEqual({ value: 4, capital: 11000 });
  });

  test("reuses an existing lot whose capital matches at the record precision", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    const recordId = await runDraft(
      recordLayer,
      input({
        mode: "outcoming",
        listings: [
          {
            listingId: "l1",
            name: "Kopi",
            code: "",
            kind: "retail",
            unit: 1,
            price: 1000,
            qty: 4,
            discounts: [],
          },
        ],
        subTotal: 4000,
        total: 4000,
        pay: 4000,
      }),
    );

    const lot = db.query("SELECT stock_value FROM stocks WHERE stock_id = 's1'").get() as {
      stock_value: number;
    };
    expect(lot.stock_value).toBe(6);
    const event = db
      .query("SELECT stock_id, product_event_value AS value FROM product_events WHERE record_id = ?")
      .get(recordId) as { stock_id: string; value: number };
    expect(event).toEqual({ stock_id: "s1", value: 4 });
    expect(
      (db.query("SELECT COUNT(*) AS n FROM stocks WHERE product_id = 'p1'").get() as { n: number }).n,
    ).toBe(2);
  });

  test("consolidates matching lots into the oldest one before receiving", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    db.exec(`
      INSERT INTO stocks (
        stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
      ) VALUES ('s3', 'p1', 5, 1000, 3, 3);
    `);
    const recordId = await runDraft(
      recordLayer,
      input({
        mode: "outcoming",
        listings: [
          {
            listingId: "l1",
            name: "Kopi",
            code: "",
            kind: "retail",
            unit: 1,
            price: 1000,
            qty: 4,
            discounts: [],
          },
        ],
        subTotal: 4000,
        total: 4000,
        pay: 4000,
      }),
    );

    const lots = db
      .query("SELECT stock_id, stock_value FROM stocks ORDER BY stock_id")
      .all() as { stock_id: string; stock_value: number }[];
    expect(lots).toEqual([
      { stock_id: "s1", stock_value: 11 },
      { stock_id: "s2", stock_value: 5 },
      { stock_id: "s3", stock_value: 0 },
    ]);
    const events = db
      .query(
        `SELECT product_event_value AS value, product_event_capital AS capital,
                stock_id, record_id
         FROM product_events ORDER BY rowid`,
      )
      .all() as {
      value: number;
      capital: number;
      stock_id: string;
      record_id: string | null;
    }[];
    expect(events.filter((event) => event.record_id === null)).toHaveLength(2);
    expect(events.filter((event) => event.stock_id === "s1").map((event) => event.value)).toEqual([
      5, 4,
    ]);
    expect(events.filter((event) => event.stock_id === "s3").map((event) => event.value)).toEqual([
      -5,
    ]);
    const portion = db
      .query("SELECT record_listing_capital AS capital FROM record_listings WHERE record_id = ?")
      .get(recordId) as { capital: number };
    expect(portion.capital).toBe(1000);
  });

  test("creates and snapshots a new supplier", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    const recordId = await runDraft(
      recordLayer,
      input({ mode: "outcoming", supplier: { id: null, name: "Toko Sumber" } }),
    );

    const record = db
      .query("SELECT record_supplier_id, record_supplier_name FROM records WHERE record_id = ?")
      .get(recordId) as { record_supplier_id: string | null; record_supplier_name: string };
    expect(record.record_supplier_name).toBe("Toko Sumber");
    expect(record.record_supplier_id).not.toBeNull();
    expect(
      db.query("SELECT supplier_name FROM suppliers WHERE supplier_id = ?").get(record.record_supplier_id!) as {
        supplier_name: string;
      },
    ).toEqual({ supplier_name: "Toko Sumber" });
  });

  test("rejects a negative line price", async () => {
    const { recordLayer, seed } = setup();
    seed();
    const result = await runDraftEither(
      recordLayer,
      input({
        mode: "outcoming",
        listings: [
          {
            listingId: "l1",
            name: "Kopi",
            code: "",
            kind: "retail",
            unit: 1,
            price: -1,
            qty: 1,
            discounts: [],
          },
        ],
      }),
    );
    expectRecordError(result, "Harga");
  });
});

describe("RecordService.add.draft — direct branches", () => {
  test("writes an outcoming purchase at the allocated capital", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    const recordId = await runDraft(recordLayer, input({ mode: "outcoming" }));

    const record = db
      .query("SELECT record_mode, record_paid_at, record_credit_at FROM records WHERE record_id = ?")
      .get(recordId) as {
      record_mode: string;
      record_paid_at: number | null;
      record_credit_at: number | null;
    };
    expect(record.record_mode).toBe("outcoming");
    expect(record.record_paid_at).not.toBeNull();
    expect(record.record_credit_at).toBeNull();

    const portion = db
      .query(
        `SELECT record_listing_qty AS qty, record_listing_capital AS capital,
                record_listing_total AS total, record_listing_price AS price
         FROM record_listings WHERE record_id = ?`,
      )
      .get(recordId) as { qty: number; capital: number; total: number; price: number };
    expect(portion).toEqual({ qty: 4, capital: 10000, total: 40000, price: 10000 });

    const events = db
      .query(
        `SELECT product_event_value AS value, product_event_capital AS capital
         FROM product_events WHERE record_id = ?`,
      )
      .all(recordId) as { value: number; capital: number }[];
    expect(events).toEqual([{ value: 4, capital: 10000 }]);

    const lot = db
      .query("SELECT stock_value, stock_capital FROM stocks WHERE product_id = 'p1' AND stock_capital = 10000")
      .get() as { stock_value: number; stock_capital: number };
    expect(lot).toEqual({ stock_value: 4, stock_capital: 10000 });
  });

  test("refuses an empty line list", async () => {
    const { recordLayer, seed } = setup();
    seed();
    const result = await runDraftEither(recordLayer, input({ listings: [] }));
    expectRecordError(result, "minimal satu barang");
  });

  test("refuses a manual line with a blank name", async () => {
    const { recordLayer, seed } = setup();
    seed();
    const result = await runDraftEither(
      recordLayer,
      input({ listings: [manual({ name: "   " })] }),
    );
    expectRecordError(result, "Nama barang manual");
  });

  test("refuses a manual line with unit 0", async () => {
    const { recordLayer, seed } = setup();
    seed();
    const result = await runDraftEither(
      recordLayer,
      input({ listings: [manual({ unit: 0 })] }),
    );
    expectRecordError(result, "tidak valid");
  });

  test("drops negative qty lines and then refuses the empty cart", async () => {
    const { recordLayer, seed } = setup();
    seed();
    const result = await runDraftEither(
      recordLayer,
      input({ listings: [manual({ qty: -2 })] }),
    );
    expectRecordError(result, "minimal satu barang");
  });

  test("refuses a non-finite qty", async () => {
    const { recordLayer, seed } = setup();
    seed();
    const result = await runDraftEither(
      recordLayer,
      input({
        listings: [manual({ qty: Number.POSITIVE_INFINITY })],
        pay: Number.POSITIVE_INFINITY,
        subTotal: Number.POSITIVE_INFINITY,
        total: Number.POSITIVE_INFINITY,
        methods: [{ methodId: "cash", pay: Number.POSITIVE_INFINITY }],
      }),
    );
    expectRecordError(result, "Jumlah barang tidak valid");
  });

  test("moves tx images to record images and deletes the tx row", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    db.exec(`
      INSERT INTO tx_images (tx_image_id, tx_image_order, tx_image_name, tx_image_mime, tx_record_id)
      VALUES ('ti1', 0, 'photo.png', 'image/png', 'd1');
    `);
    await runDraft(
      recordLayer,
      input({ images: [{ order: 0, name: "photo.png", mime: "image/png" }] }),
    );
    const image = db
      .query("SELECT record_image_order, record_image_name, record_image_mime FROM record_images")
      .get();
    expect(image).toEqual({
      record_image_order: 0,
      record_image_name: "photo.png",
      record_image_mime: "image/png",
    });
    expect(db.query("SELECT COUNT(*) AS n FROM tx_images").get()).toEqual({ n: 0 });
    expect(db.query("SELECT COUNT(*) AS n FROM tx_records").get()).toEqual({ n: 0 });
  });

  test("tolerates a missing tx_records row", async () => {
    const { db, recordLayer, seed } = setup();
    seed();
    db.exec("DELETE FROM tx_records WHERE tx_record_id = 'd1'");
    await runDraft(recordLayer, input({ draftId: "gone" }));
    expect(db.query("SELECT COUNT(*) AS n FROM records").get()).toEqual({ n: 1 });
  });
});
