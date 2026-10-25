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
  });
});
