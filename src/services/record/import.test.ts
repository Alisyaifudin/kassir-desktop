import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "./live";
import { RecordService, type RecordImport } from ".";
import { validateRecordLine } from "./validate-line";

/**
 * The Settings → Data JSON import is the one boundary where the app takes
 * structured data from outside its own writers. It used to validate the *shape*
 * of the file only: a `qty: -3` line wrote a record with a negative total while
 * moving no stock (FIFO stops at `remaining > 0`), and the same line on a
 * purchase created a negative lot in `stocks`/`product_events` — permanent,
 * event-sourced history that nothing reported as an error.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));

  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1);
  `);

  return { db, recordLayer };
}

function run<A>(
  recordLayer: Layer.Layer<RecordService>,
  program: (record: Context.Tag.Service<typeof RecordService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const record = yield* RecordService;
      return yield* program(record);
    }).pipe(Effect.provide(recordLayer)),
  );
}

/** A record shaped like the export the Settings → Data screen writes. */
function imported(overrides: Partial<RecordImport["listings"][number]> = {}): RecordImport {
  return {
    paidAt: 1_000,
    rounding: 0,
    isCredit: false,
    cashier: "Kasir",
    mode: "incoming",
    pay: 10_000,
    note: "",
    fix: 0,
    customer: { name: "", phone: "" },
    subTotal: 10_000,
    total: 10_000,
    methods: [{ methodId: "cash", pay: 10_000 }],
    listings: [
      {
        listingId: null,
        name: "Kopi",
        kind: "retail",
        price: 10_000,
        qty: 1,
        capital: 5_000,
        total: 10_000,
        discounts: [],
        ...overrides,
      },
    ],
    extras: [],
  };
}

function recordCount(db: ReturnType<typeof makeTestDatabase>["db"]): number {
  return (db.query("SELECT COUNT(*) AS n FROM records").get() as { n: number }).n;
}

describe("record import boundary", () => {
  test("the shared line rules reject negative, zero and fractional quantities", () => {
    const line = { name: "Kopi", price: 1_000, capital: 500, listingId: null };

    expect(validateRecordLine({ ...line, qty: 1 })).toBeNull();
    expect(validateRecordLine({ ...line, qty: -3 })).toContain("Jumlah");
    expect(validateRecordLine({ ...line, qty: 0 })).toContain("Jumlah");
    expect(validateRecordLine({ ...line, qty: Number.NaN })).toContain("Jumlah");
    expect(validateRecordLine({ ...line, qty: 1, price: -1 })).toContain("Harga");
    expect(validateRecordLine({ ...line, qty: 1, capital: -1 })).toContain("Modal");
    expect(validateRecordLine({ ...line, qty: 1, unit: 0 })).toContain("Satuan");
    expect(validateRecordLine({ ...line, qty: 1, name: "  " })).toContain("Nama");
  });

  test("a record with a negative quantity writes nothing and moves no stock", async () => {
    const { db, recordLayer } = setup();

    const error = await run(recordLayer, (record) =>
      Effect.either(record.add.external(imported({ qty: -3 }))),
    );

    expect(error._tag).toBe("Left");
    expect(recordCount(db)).toBe(0);
    expect(db.query("SELECT COUNT(*) AS n FROM record_listings").get()).toEqual({ n: 0 });
    expect(db.query("SELECT COUNT(*) AS n FROM product_events").get()).toEqual({ n: 0 });
  });

  test("a negative price or capital on a purchase writes no lot", async () => {
    const { db, recordLayer } = setup();

    const negativePrice = await run(recordLayer, (record) =>
      Effect.either(record.add.external({ ...imported({ price: -1 }), mode: "outcoming" })),
    );
    const negativeCapital = await run(recordLayer, (record) =>
      Effect.either(record.add.external({ ...imported({ capital: -1 }), mode: "outcoming" })),
    );

    expect(negativePrice._tag).toBe("Left");
    expect(negativeCapital._tag).toBe("Left");
    expect(db.query("SELECT COUNT(*) AS n FROM stocks").get()).toEqual({ n: 0 });
    expect(db.query("SELECT COUNT(*) AS n FROM product_events").get()).toEqual({ n: 0 });
  });

  test("a record with no lines is refused instead of importing an empty sale", async () => {
    const { db, recordLayer } = setup();

    const error = await run(recordLayer, (record) =>
      Effect.either(record.add.external({ ...imported(), listings: [] })),
    );

    expect(error._tag).toBe("Left");
    expect(recordCount(db)).toBe(0);
  });

  test("a valid record still imports with its method row", async () => {
    const { db, recordLayer } = setup();

    const error = await run(recordLayer, (record) =>
      Effect.either(record.add.external(imported({ qty: 2 }))),
    );

    expect(error._tag).toBe("Right");
    expect(recordCount(db)).toBe(1);
    expect(db.query("SELECT COUNT(*) AS n FROM record_listings").get()).toEqual({ n: 1 });
    expect(db.query("SELECT COUNT(*) AS n FROM record_methods").get()).toEqual({ n: 1 });
    // No `portions` in an old file: the line is written as a manual one and the
    // stock journal is left alone, exactly as before the export carried events.
    expect(db.query("SELECT COUNT(*) AS n FROM product_events").get()).toEqual({ n: 0 });
  });
});

/**
 * The other half of the import boundary: a file downloaded *after* the export
 * started carrying each line's per-lot portions and their `product_events` rows.
 *
 * The writer appends those rows instead of replaying FIFO, so the questions are
 * "did the journal land as it was" and "was the stock lot folded back out of
 * it" — not "did a line get written".
 */
function setupArchive() {
  const { db, recordLayer } = setup();
  // Both events name this product; a product row has to exist for its lots to be
  // folded (`stocks.product_id` is still a foreign key).
  db.exec(`
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
  `);
  return { db, recordLayer };
}

/** One sold line split across two lots, as the Settings → Data export writes it. */
function archived(): RecordImport {
  return {
    ...imported(),
    subTotal: 30_000,
    total: 30_000,
    pay: 30_000,
    methods: [{ methodId: "cash", pay: 30_000 }],
    listings: [
      {
        listingId: null,
        name: "Kopi",
        kind: "retail",
        price: 10_000,
        qty: 3,
        capital: 5_000,
        total: 30_000,
        discounts: [],
        portions: [
          {
            unit: 1,
            qty: 2,
            capital: 4_000,
            total: 20_000,
            event: {
              id: "e1",
              createdAt: 900,
              value: -2,
              capital: 4_000,
              note: "",
              productId: "p1",
              stockId: "s1",
            },
          },
          {
            unit: 1,
            qty: 1,
            capital: 6_000,
            total: 10_000,
            event: {
              id: "e2",
              createdAt: 900,
              value: -1,
              capital: 6_000,
              note: "",
              productId: "p1",
              stockId: "s2",
            },
          },
        ],
      },
    ],
  };
}

type Db = ReturnType<typeof setup>["db"];

function events(db: Db) {
  return db
    .query(
      `SELECT product_event_id AS id, product_event_value AS value,
              product_event_capital AS capital, stock_id, record_id
         FROM product_events ORDER BY product_event_id`,
    )
    .all() as {
    id: string;
    value: number;
    capital: number;
    stock_id: string | null;
    record_id: string | null;
  }[];
}

describe("record import with journal rows", () => {
  test("restores the events and folds the lots back out of them", async () => {
    const { db, recordLayer } = setupArchive();

    const result = await run(recordLayer, (record) =>
      Effect.either(record.add.external(archived())),
    );

    expect(result._tag).toBe("Right");
    expect(recordCount(db)).toBe(1);
    expect(db.query("SELECT COUNT(*) AS n FROM record_listings").get()).toEqual({ n: 2 });

    // The journal landed as the file stated it, attributed to the new record.
    const recordId = (db.query("SELECT record_id FROM records").get() as { record_id: string })
      .record_id;
    expect(events(db).map((event) => [event.id, event.value, event.capital, event.stock_id])).toEqual(
      [
        ["e1", -2, 4_000, "s1"],
        ["e2", -1, 6_000, "s2"],
      ],
    );
    expect(events(db).map((event) => event.record_id)).toEqual([recordId, recordId]);

    // Every portion names the event it caused, and the product it moved.
    expect(
      db
        .query(
          `SELECT product_event_id, product_id FROM record_listings ORDER BY rowid`,
        )
        .all(),
    ).toEqual([
      { product_event_id: "e1", product_id: "p1" },
      { product_event_id: "e2", product_id: "p1" },
    ]);

    // `stocks` is a projection of the journal: the lots the target never had are
    // recreated with the balance and cost the events state.
    expect(
      db
        .query("SELECT stock_id, stock_value, stock_capital FROM stocks ORDER BY stock_id")
        .all(),
    ).toEqual([
      { stock_id: "s1", stock_value: -2, stock_capital: 4_000 },
      { stock_id: "s2", stock_value: -1, stock_capital: 6_000 },
    ]);
  });

  test("one line discount is split across the portions, not copied whole", async () => {
    const { db, recordLayer } = setupArchive();
    const record = archived();
    record.listings[0]!.discounts = [{ kind: "number", value: 3_000, eff: 3_000 }];

    const result = await run(recordLayer, (service) =>
      Effect.either(service.add.external(record)),
    );

    expect(result._tag).toBe("Right");
    const rows = db
      .query("SELECT discount_group_id, discount_eff FROM discounts ORDER BY discount_eff")
      .all() as { discount_group_id: string; discount_eff: number }[];
    // Two thirds of the money on the two-thirds portion, a third on the rest, and
    // one group id so the read model shows the discount once.
    expect(rows.map((row) => row.discount_eff)).toEqual([1_000, 2_000]);
    expect(new Set(rows.map((row) => row.discount_group_id)).size).toBe(1);
  });

  test("importing the same file twice appends each event once", async () => {
    const { db, recordLayer } = setupArchive();

    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await run(recordLayer, (record) =>
        Effect.either(record.add.external(archived())),
      );
      expect(result._tag).toBe("Right");
    }

    // The record is duplicated — the import has never deduplicated records — but
    // the append-only journal is not, so stock does not double-count the movement.
    expect(recordCount(db)).toBe(2);
    expect(events(db)).toHaveLength(2);
    expect(
      db
        .query("SELECT stock_id, stock_value FROM stocks ORDER BY stock_id")
        .all(),
    ).toEqual([
      { stock_id: "s1", stock_value: -2 },
      { stock_id: "s2", stock_value: -1 },
    ]);
  });

  test("a movement that contradicts the record's mode is refused", async () => {
    const { db, recordLayer } = setupArchive();
    const record = archived();
    // A sale that adds stock: the file is stale or hand-edited.
    record.listings[0]!.portions![0]!.event!.value = 2;

    const result = await run(recordLayer, (service) =>
      Effect.either(service.add.external(record)),
    );

    expect(result._tag).toBe("Left");
    expect(recordCount(db)).toBe(0);
    expect(events(db)).toHaveLength(0);
  });

  test("an event naming a product this device does not have is refused", async () => {
    const { db, recordLayer } = setupArchive();
    const record = archived();
    record.listings[0]!.portions![0]!.event!.productId = "gone";

    const result = await run(recordLayer, (service) =>
      Effect.either(service.add.external(record)),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left.message).toContain("Barang");
    expect(recordCount(db)).toBe(0);
    expect(events(db)).toHaveLength(0);
  });

  test("a portion with no event keeps its shape and writes no movement", async () => {
    const { db, recordLayer } = setupArchive();
    const record = archived();
    record.listings = [
      {
        ...record.listings[0]!,
        qty: 1,
        total: 10_000,
        portions: [
          { unit: 1, qty: 1, capital: 5_000, total: 10_000, event: null },
        ],
      },
    ];
    record.subTotal = 10_000;
    record.total = 10_000;
    record.pay = 10_000;
    record.methods = [{ methodId: "cash", pay: 10_000 }];

    const result = await run(recordLayer, (service) =>
      Effect.either(service.add.external(record)),
    );

    expect(result._tag).toBe("Right");
    expect(db.query("SELECT COUNT(*) AS n FROM record_listings").get()).toEqual({ n: 1 });
    expect(events(db)).toHaveLength(0);
  });
});
