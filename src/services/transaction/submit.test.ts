import type { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { Context, Effect, Either, Layer } from "effect";
import { recalcDiscounts } from "~/lib/purchase";
import { makeTestDatabase } from "../db/test-support";
import { ProductError, ProductService } from "../product";
import { ProductLive } from "../product/live";
import { RecordLive } from "../record/live";
import { RecordService } from "../record";
import {
  SubmitError,
  TransactionError,
  TransactionService,
  type DraftDiscount,
  type DraftExtra,
  type DraftListing,
  type DraftMethod,
  type DraftMode,
} from ".";
import { TransactionLive } from "./live";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function setup() {
  const { db, layer } = makeTestDatabase();
  const productLayer = ProductLive.pipe(Layer.provide(layer));
  const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(productLayer));
  const transactionLayer = TransactionLive.pipe(
    Layer.provide(layer),
    Layer.provide(recordLayer),
  );
  return { db, transactionLayer, recordLayer };
}

/** The catalog every test starts from: one product, two lots, one customer. */
function seed(db: Database) {
  db.exec(`
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1), ('qris', 'QRIS', 'qris', 1),
             ('debit', 'Debit', 'debit', 1);
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO listings (
      listing_id, product_id, listing_name, listing_price, listing_unit,
      listing_kind, listing_updated_at
    ) VALUES ('l1', 'p1', 'Kopi', 10000, 1, 'retail', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 2, 1000, 1, 1), ('s2', 'p1', 5, 2000, 2, 2);
    INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at)
      VALUES ('c1', 'Siti', '0811', 1);
  `);
}

let lineSeq = 0;
function makeLine(overrides: Partial<DraftListing> = {}): DraftListing {
  lineSeq += 1;
  const price = overrides.price ?? 10000;
  const qty = overrides.qty ?? 4;
  return {
    id: `line-${lineSeq}`,
    listingId: "l1",
    name: "Kopi",
    code: "",
    unit: 1,
    price,
    qty,
    ...overrides,
    discounts: recalcDiscounts(price, qty, overrides.discounts ?? []),
  };
}

let methodSeq = 0;
function makeMethod(value = 40000, methodId = "cash"): DraftMethod {
  methodSeq += 1;
  return { id: `method-${methodSeq}`, methodId, value };
}

let extraSeq = 0;
function makeExtra(kind: DraftExtra["kind"], value: number, name = "Biaya"): DraftExtra {
  extraSeq += 1;
  return { id: `extra-${extraSeq}`, name, kind, value };
}

let discountSeq = 0;
function makeDiscount(kind: DraftDiscount["kind"], value: number): DraftDiscount {
  discountSeq += 1;
  return { id: `discount-${discountSeq}`, kind, value, eff: 0, total: 0 };
}

type SaleOptions = {
  mode?: DraftMode;
  lines?: DraftListing[];
  methods?: DraftMethod[];
  extras?: DraftExtra[];
  rounding?: number;
  fix?: number;
  note?: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  supplierName?: string;
  credit?: boolean;
  stored?: boolean;
  cashier?: string;
  secondSubmit?: boolean;
  seed?: (db: Database) => void;
};

type SaleResult = Either.Either<string, TransactionError | SubmitError>;

async function submit(options: SaleOptions = {}) {
  const { db, transactionLayer } = setup();
  seed(db);
  options.seed?.(db);

  const outcome = await Effect.runPromise(
    Effect.gen(function* () {
      const tx = yield* TransactionService;
      const id = yield* tx.add.new(options.mode ?? "incoming");
      yield* tx.listings.set(id, options.lines ?? [makeLine()]);
      yield* tx.methods.set(id, options.methods ?? [makeMethod()]);
      yield* tx.set.fix(id, options.fix ?? 0);
      yield* tx.set.rounding(id, options.rounding ?? 0);
      if (options.note !== undefined) yield* tx.set.note(id, options.note);
      if (options.customerId !== undefined) yield* tx.set.customer(id, options.customerId);
      if (options.customerName !== undefined) {
        yield* tx.set.customerName(id, options.customerName);
      }
      if (options.customerPhone !== undefined) {
        yield* tx.set.customerPhone(id, options.customerPhone);
      }
      if (options.supplierName !== undefined) {
        yield* tx.set.supplierName(id, options.supplierName);
      }
      if (options.extras !== undefined) yield* tx.extras.set(id, options.extras);
      if (options.stored === true) yield* tx.set.store(id);

      const result = yield* Effect.either(
        tx.submit(id, { cashier: options.cashier ?? "Kasir", credit: options.credit }),
      );
      const second =
        options.secondSubmit === true
          ? yield* Effect.either(tx.submit(id, { cashier: "Kasir" }))
          : null;

      // Cancel the debounce the setters above armed; a successful submit has
      // already removed the draft, and the delete is then a no-op.
      yield* tx.delete.byId(id);
      return { result, second, id };
    }).pipe(Effect.provide(transactionLayer)),
  );

  return { ...outcome, db };
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

function submitError(result: SaleResult): SubmitError | null {
  if (result._tag !== "Left" || result.left._tag !== "SubmitError") return null;
  return result.left;
}

function transactionError(result: SaleResult): TransactionError | null {
  if (result._tag !== "Left" || result.left._tag !== "TransactionError") return null;
  return result.left;
}

function expectSubmitKind(result: SaleResult, kind: SubmitError["kind"]) {
  const error = submitError(result);
  expect(error).not.toBeNull();
  if (error !== null) expect(error.kind).toBe(kind);
}

function expectSubmitMessage(result: SaleResult, contains: string) {
  const error = submitError(result);
  expect(error).not.toBeNull();
  if (error !== null) expect(error.message).toContain(contains);
}

function expectTransactionMessage(result: SaleResult, contains: string) {
  const error = transactionError(result);
  expect(error).not.toBeNull();
  if (error !== null) expect(error.message).toContain(contains);
}

function right(result: SaleResult): string {
  expect(result._tag).toBe("Right");
  return result._tag === "Right" ? result.right : "";
}

type RecordRow = {
  record_id: string;
  record_paid_at: number;
  record_rounding: number;
  record_credit_at: number | null;
  record_cashier: string;
  record_mode: string;
  record_pay: number;
  record_note: string;
  record_fix: number;
  record_customer_name: string;
  record_customer_phone: string;
  record_sub_total: number;
  record_total: number;
  record_updated_at: number;
  record_sync_at: number | null;
  record_deleted_at: number | null;
};

type PortionRow = {
  record_listing_id: string;
  record_listing_group_id: string;
  record_id: string;
  product_event_id: string | null;
  product_id: string | null;
  record_listing_name: string;
  record_listing_kind: string;
  record_listing_unit: number;
  record_listing_price: number;
  record_listing_qty: number;
  record_listing_capital: number;
  record_listing_total: number;
};

type StockRow = { stock_id: string; stock_value: number; stock_capital: number };

type EventRow = {
  product_event_value: number;
  product_event_capital: number;
  stock_id: string | null;
};

type DiscountRow = {
  discount_group_id: string;
  record_listing_id: string;
  discount_kind: string;
  discount_value: number;
  discount_eff: number;
};

type ExtraRow = {
  record_extra_name: string;
  record_extra_value: number;
  record_extra_eff: number;
  record_extra_kind: string;
};

type MethodRow = { method_id: string; record_method_pay: number };
type CustomerRow = { customer_id: string; customer_name: string; customer_phone: string };

function recordOf(db: Database, id: string): RecordRow {
  return db.query("SELECT * FROM records WHERE record_id = ?").get(id) as RecordRow;
}
function portionsOf(db: Database, id: string): PortionRow[] {
  return db
    .query("SELECT * FROM record_listings WHERE record_id = ? ORDER BY rowid")
    .all(id) as PortionRow[];
}
function stocksOf(db: Database): StockRow[] {
  return db
    .query("SELECT stock_id, stock_value, stock_capital FROM stocks ORDER BY stock_id")
    .all() as StockRow[];
}
function eventsOf(db: Database, id: string): EventRow[] {
  return db
    .query(
      "SELECT * FROM product_events WHERE record_id = ? ORDER BY product_event_created_at, rowid",
    )
    .all(id) as EventRow[];
}
function discountsOf(db: Database, id: string): DiscountRow[] {
  return db
    .query(
      `SELECT d.* FROM discounts d
       JOIN record_listings rl ON rl.record_listing_id = d.record_listing_id
       WHERE rl.record_id = ? ORDER BY d.rowid`,
    )
    .all(id) as DiscountRow[];
}
function extrasOf(db: Database, id: string): ExtraRow[] {
  return db
    .query(
      `SELECT record_extra_name, record_extra_value, record_extra_eff, record_extra_kind
       FROM record_extras WHERE record_id = ? ORDER BY rowid`,
    )
    .all(id) as ExtraRow[];
}
function methodsOf(db: Database, id: string): MethodRow[] {
  return db
    .query("SELECT method_id, record_method_pay FROM record_methods WHERE record_id = ? ORDER BY rowid")
    .all(id) as MethodRow[];
}
function customersOf(db: Database): CustomerRow[] {
  return db
    .query("SELECT customer_id, customer_name, customer_phone FROM customers ORDER BY customer_name")
    .all() as CustomerRow[];
}
function count(
  db: Database,
  table: "records" | "record_listings" | "product_events" | "tx_records" | "tx_images",
) {
  return (db.query(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

// ---------------------------------------------------------------------------
// Guardrails: the draft is not eligible to submit
// ---------------------------------------------------------------------------

describe("TransactionService.submit — eligibility", () => {
  test("rejects a missing draft", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const keep = yield* tx.add.new("incoming");
        const result = yield* Effect.either(tx.submit("missing", { cashier: "Kasir" }));
        yield* tx.delete.byId(keep);
        return result;
      }).pipe(Effect.provide(transactionLayer)),
    );
    expectSubmitKind(result, "empty");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a parked (stored) cart", async () => {
    const { db, result } = await submit({ stored: true });
    expectSubmitKind(result, "stored");
    expect(count(db, "records")).toBe(0);
  });

  test("submits an outcoming (purchase) draft and snapshots its supplier", async () => {
    const { db, result } = await submit({ mode: "outcoming", supplierName: "Toko Sumber" });
    const recordId = right(result);
    const record = db
      .query(
        "SELECT record_mode, record_paid_at, record_credit_at, record_supplier_name FROM records WHERE record_id = ?",
      )
      .get(recordId) as {
      record_mode: string;
      record_paid_at: number | null;
      record_credit_at: number | null;
      record_supplier_name: string;
    };
    expect(record.record_mode).toBe("outcoming");
    expect(record.record_paid_at).not.toBeNull();
    expect(record.record_credit_at).toBeNull();
    expect(record.record_supplier_name).toBe("Toko Sumber");
    const event = db
      .query(
        "SELECT product_event_value, product_event_capital FROM product_events WHERE record_id = ?",
      )
      .get(recordId) as { product_event_value: number; product_event_capital: number };
    expect(event).toEqual({ product_event_value: 4, product_event_capital: 10000 });
    expect(count(db, "records")).toBe(1);
  });

  test("submits a cash purchase as a credit, ignoring payment and rounding", async () => {
    const { db, result } = await submit({
      mode: "outcoming",
      credit: true,
      rounding: 1000,
      supplierName: "Toko Sumber",
    });
    const recordId = right(result);
    const record = db
      .query(
        `SELECT record_paid_at, record_credit_at, record_pay, record_rounding,
                record_supplier_name
         FROM records WHERE record_id = ?`,
      )
      .get(recordId) as {
      record_paid_at: number | null;
      record_credit_at: number | null;
      record_pay: number;
      record_rounding: number;
      record_supplier_name: string;
    };
    expect(record.record_paid_at).toBeNull();
    expect(record.record_credit_at).not.toBeNull();
    expect(record.record_pay).toBe(0);
    expect(record.record_rounding).toBe(0);
    expect(record.record_supplier_name).toBe("Toko Sumber");
    expect(
      db
        .query("SELECT method_id, record_method_pay FROM record_methods WHERE record_id = ?")
        .get(recordId),
    ).toEqual({ method_id: "cash", record_method_pay: 0 });
    const event = db
      .query(
        "SELECT product_event_value AS value, product_event_capital AS capital FROM product_events WHERE record_id = ?",
      )
      .get(recordId) as { value: number; capital: number };
    expect(event).toEqual({ value: 4, capital: 10000 });
  });

  test("rejects a draft with no listings", async () => {
    const { db, result } = await submit({ lines: [] });
    expectSubmitKind(result, "empty");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a draft whose lines all have qty 0", async () => {
    const { db, result } = await submit({ lines: [makeLine({ qty: 0 })] });
    expectSubmitKind(result, "empty");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a draft whose only line has NaN qty", async () => {
    const { db, result } = await submit({ lines: [makeLine({ qty: Number.NaN })] });
    expectSubmitKind(result, "empty");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a manual line with a blank name", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ listingId: null, name: "   " })],
    });
    expectSubmitKind(result, "name");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a manual line with unit 0", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ listingId: null, name: "Baru", unit: 0 })],
    });
    expectSubmitKind(result, "code");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a manual line with a fractional unit", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ listingId: null, name: "Baru", unit: 1.5 })],
    });
    expectSubmitKind(result, "code");
    expect(count(db, "records")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Guardrails: money
// ---------------------------------------------------------------------------

describe("TransactionService.submit — payment", () => {
  test("rejects a zero-total sale", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ price: 0 })],
      methods: [makeMethod(40000)],
    });
    expectSubmitKind(result, "payment");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects underpayment", async () => {
    const { db, result } = await submit({ methods: [makeMethod(30000)] });
    expectSubmitKind(result, "payment");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a discount that eats the whole line", async () => {
    // 100% of a Rp40.000 line leaves nothing to pay for.
    const { db, result } = await submit({
      lines: [makeLine({ discounts: [makeDiscount("percent", 100)] })],
      methods: [makeMethod(40000)],
    });
    expectSubmitKind(result, "price");
    expectSubmitMessage(result, "Diskon Kopi");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a pcs discount larger than the quantity", async () => {
    // `pcs: 9` on four pieces is 9 × the price — clamped to the line, so the
    // line is fully discounted and the sale is refused rather than stored.
    const { db, result } = await submit({
      lines: [makeLine({ discounts: [makeDiscount("pcs", 9)] })],
      methods: [makeMethod(40000)],
    });
    expectSubmitKind(result, "price");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a negative total from a deduction larger than the goods", async () => {
    // A −50.000 "extra" on a 40.000 sale used to be storable: `grand` is
    // negative, the tender is "enough", and the change reads positive.
    const { db, result } = await submit({
      extras: [makeExtra("number", -50000)],
      methods: [makeMethod(40000)],
    });
    expectSubmitKind(result, "payment");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a change that rounds negative at the draft's fix", async () => {
    // 100.005 at fix 2 is 100.01; 100.00 would leave -0.01.
    const { db, result } = await submit({
      lines: [makeLine({ price: 100.005, qty: 1 })],
      methods: [makeMethod(100)],
      fix: 2,
    });
    expectSubmitKind(result, "payment");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a negative line price before payment", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ price: -100, qty: 4 })],
      methods: [],
    });
    expectSubmitKind(result, "price");
    expect(count(db, "records")).toBe(0);
  });

  test("rejects a method the catalog does not know", async () => {
    const { db, result } = await submit({ methods: [makeMethod(40000, "nope")] });
    expectTransactionMessage(result, "FOREIGN KEY");
    expect(count(db, "records")).toBe(0);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 2, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 5, stock_capital: 2000 },
    ]);
  });

  test("accepts change, rounding and a split payment", async () => {
    const { db, result } = await submit({
      rounding: 500,
      methods: [makeMethod(20000, "cash"), makeMethod(21000, "qris")],
    });
    const id = right(result);
    const record = recordOf(db, id);
    expect(record.record_total).toBe(40000);
    expect(record.record_rounding).toBe(500);
    expect(record.record_pay).toBe(41000);
    expect(record.record_fix).toBe(0);
    expect(methodsOf(db, id)).toEqual([
      { method_id: "cash", record_method_pay: 20000 },
      { method_id: "qris", record_method_pay: 21000 },
    ]);
  });

  test("filters zero-value methods and keeps the rest", async () => {
    const { db, result } = await submit({
      methods: [makeMethod(40000, "cash"), makeMethod(0, "qris"), makeMethod(0, "debit")],
    });
    const id = right(result);
    expect(methodsOf(db, id)).toEqual([{ method_id: "cash", record_method_pay: 40000 }]);
    expect(recordOf(db, id).record_pay).toBe(40000);
  });
});

// ---------------------------------------------------------------------------
// Guardrails: listings and stock
// ---------------------------------------------------------------------------

describe("TransactionService.submit — listings", () => {
  test("rejects a manual barcode that an existing barcode already owns", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec("UPDATE listings SET listing_code = 'abc', listing_code_kind = 'barcode' WHERE listing_id = 'l1'");
      },
      lines: [makeLine({ listingId: null, name: "Baru", code: "ABC", price: 10000, qty: 1 })],
      methods: [makeMethod(10000)],
    });
    expectTransactionMessage(result, "sudah dipakai");
    expect(count(db, "records")).toBe(0);
    expect(count(db, "record_listings")).toBe(0);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 2, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 5, stock_capital: 2000 },
    ]);
  });

  test("rejects two manual lines that share a code", async () => {
    const { db, result } = await submit({
      lines: [
        makeLine({ listingId: null, name: "A", code: "abc", price: 5000, qty: 1 }),
        makeLine({ listingId: null, name: "B", code: "ABC", price: 5000, qty: 1 }),
      ],
      methods: [makeMethod(10000)],
    });
    expectTransactionMessage(result, "lebih dari satu");
    expect(count(db, "records")).toBe(0);
    expect(count(db, "record_listings")).toBe(0);
  });

  test("rejects a non-finite qty that slips past the qty > 0 filter", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ qty: Number.POSITIVE_INFINITY })],
      methods: [makeMethod(Number.POSITIVE_INFINITY)],
    });
    expectTransactionMessage(result, "Jumlah barang tidak valid");
    expect(count(db, "records")).toBe(0);
  });

  test("allows a manual code that collides only with a QR listing", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec("UPDATE listings SET listing_code = 'abc', listing_code_kind = 'qr' WHERE listing_id = 'l1'");
      },
      lines: [makeLine({ listingId: null, name: "Baru", code: "ABC", price: 1000, qty: 1 })],
      methods: [makeMethod(1000)],
    });
    const id = right(result);
    const listing = db
      .query("SELECT listing_code, listing_code_kind FROM listings WHERE listing_id <> 'l1'")
      .get() as { listing_code: string; listing_code_kind: string };
    expect(listing).toEqual({ listing_code: "abc", listing_code_kind: "barcode" });
    expect(recordOf(db, id).record_total).toBe(1000);
  });

  test("allows a manual barcode whose only owner is soft-deleted", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec(`
          UPDATE listings
          SET listing_code = 'abc', listing_code_kind = 'barcode', listing_deleted_at = 1
          WHERE listing_id = 'l1';
        `);
      },
      lines: [makeLine({ listingId: null, name: "Baru", code: "ABC", price: 1000, qty: 1 })],
      methods: [makeMethod(1000)],
    });
    const id = right(result);
    const listing = db
      .query("SELECT listing_code, listing_code_kind FROM listings WHERE listing_id <> 'l1'")
      .get() as { listing_code: string; listing_code_kind: string };
    expect(listing).toEqual({ listing_code: "abc", listing_code_kind: "barcode" });
    expect(recordOf(db, id).record_total).toBe(1000);
  });

  test("treats a deleted catalog listing as a no-stock line", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec("UPDATE listings SET listing_deleted_at = 1 WHERE listing_id = 'l1'");
      },
    });
    const id = right(result);
    const portions = portionsOf(db, id);
    expect(portions).toHaveLength(1);
    expect(portions[0].product_id).toBeNull();
    expect(portions[0].product_event_id).toBeNull();
    expect(portions[0].record_listing_qty).toBe(4);
    expect(portions[0].record_listing_capital).toBe(0);
    expect(portions[0].record_listing_total).toBe(40000);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 2, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 5, stock_capital: 2000 },
    ]);
  });

  test("drops a negative-qty line and submits the rest", async () => {
    const { db, result } = await submit({
      lines: [makeLine(), makeLine({ name: "Minus", price: 99999, qty: -2 })],
    });
    const id = right(result);
    expect(portionsOf(db, id)).toHaveLength(2);
    expect(recordOf(db, id).record_total).toBe(40000);
    expect(portionsOf(db, id).every((portion) => portion.record_listing_name === "Kopi")).toBe(
      true,
    );
  });

  test("drops a zero-qty line without writing it", async () => {
    const { db, result } = await submit({
      lines: [
        makeLine(),
        makeLine({ name: "Gratis", price: 99999, qty: 0 }),
      ],
    });
    const id = right(result);
    expect(portionsOf(db, id)).toHaveLength(2);
    expect(recordOf(db, id).record_sub_total).toBe(40000);
    expect(portionsOf(db, id).every((portion) => portion.record_listing_name === "Kopi")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stock movement
// ---------------------------------------------------------------------------

describe("TransactionService.submit — stock", () => {
  test("drains the oldest lots first and copies each lot's capital", async () => {
    const { db, result } = await submit();
    const id = right(result);
    const record = recordOf(db, id);
    expect(record.record_total).toBe(40000);
    expect(record.record_sub_total).toBe(40000);
    expect(record.record_pay).toBe(40000);
    expect(record.record_credit_at).toBeNull();
    expect(record.record_mode).toBe("incoming");
    expect(record.record_cashier).toBe("Kasir");

    expect(portionsOf(db, id).map((portion) => ({
      qty: portion.record_listing_qty,
      capital: portion.record_listing_capital,
      total: portion.record_listing_total,
      price: portion.record_listing_price,
      unit: portion.record_listing_unit,
      product: portion.product_id,
      event: portion.product_event_id === null ? null : "event",
    }))).toEqual([
      { qty: 2, capital: 1000, total: 20000, price: 10000, unit: 1, product: "p1", event: "event" },
      { qty: 2, capital: 2000, total: 20000, price: 10000, unit: 1, product: "p1", event: "event" },
    ]);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 3, stock_capital: 2000 },
    ]);
    expect(eventsOf(db, id).map((event) => [event.product_event_value, event.product_event_capital])).toEqual([
      [-2, 1000],
      [-2, 2000],
    ]);
    expect(count(db, "tx_records")).toBe(0);
  });

  test("lets the last lot go negative when the stock is short", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec("UPDATE stocks SET stock_value = 1 WHERE stock_id = 's2'");
      },
    });
    const id = right(result);
    expect(portionsOf(db, id).map((portion) => portion.record_listing_qty)).toEqual([2, 2]);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: -1, stock_capital: 2000 },
    ]);
  });

  test("lets the last lot absorb the whole sale when every lot is empty", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec("UPDATE stocks SET stock_value = 0");
      },
    });
    const id = right(result);
    const portions = portionsOf(db, id);
    expect(portions).toHaveLength(1);
    expect(portions[0].record_listing_qty).toBe(4);
    expect(portions[0].record_listing_capital).toBe(2000);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: -4, stock_capital: 2000 },
    ]);
    expect(eventsOf(db, id).map((event) => event.product_event_value)).toEqual([-4]);
  });

  test("skips empty lots in the middle and drains the older and newer ones", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec(`
          INSERT INTO products (product_id, product_name, product_note, product_updated_at)
            VALUES ('p2', 'Teh', '', 1);
          INSERT INTO listings (
            listing_id, product_id, listing_name, listing_price, listing_unit,
            listing_kind, listing_updated_at
          ) VALUES ('l2', 'p2', 'Teh', 1000, 1, 'retail', 1);
          INSERT INTO stocks (
            stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
          ) VALUES ('z1', 'p2', 5, 100, 1, 1), ('z2', 'p2', 0, 200, 2, 2),
                   ('z3', 'p2', 3, 300, 3, 3);
        `);
      },
      lines: [makeLine({ listingId: "l2", name: "Teh", price: 1000, qty: 10 })],
      methods: [makeMethod(10000)],
    });
    const id = right(result);
    expect(portionsOf(db, id).map((portion) => [portion.record_listing_qty, portion.record_listing_capital])).toEqual([
      [5, 100],
      [5, 300],
    ]);
    const lots = db
      .query("SELECT stock_id, stock_value FROM stocks WHERE product_id = 'p2' ORDER BY stock_id")
      .all() as { stock_id: string; stock_value: number }[];
    expect(lots).toEqual([
      { stock_id: "z1", stock_value: 0 },
      { stock_id: "z2", stock_value: 0 },
      { stock_id: "z3", stock_value: -2 },
    ]);
  });

  test("opens a negative lot at zero capital when the product has no lot", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec(`
          INSERT INTO products (product_id, product_name, product_note, product_updated_at)
            VALUES ('p2', 'Teh', '', 1);
          INSERT INTO listings (
            listing_id, product_id, listing_name, listing_price, listing_unit,
            listing_kind, listing_updated_at
          ) VALUES ('l2', 'p2', 'Teh', 5000, 1, 'retail', 1);
        `);
      },
      lines: [makeLine({ listingId: "l2", name: "Teh", price: 5000, qty: 2 })],
      methods: [makeMethod(10000)],
    });
    const id = right(result);
    const portion = portionsOf(db, id)[0];
    expect(portion.product_id).toBe("p2");
    expect(portion.record_listing_qty).toBe(2);
    expect(portion.record_listing_capital).toBe(0);
    expect(portion.record_listing_total).toBe(10000);
    const lot = db
      .query("SELECT stock_id, stock_value, stock_capital FROM stocks WHERE product_id = 'p2'")
      .get() as StockRow;
    expect(lot.stock_value).toBe(-2);
    expect(lot.stock_capital).toBe(0);
    expect(eventsOf(db, id).map((event) => [event.product_event_value, event.product_event_capital])).toEqual([
      [-2, 0],
    ]);
  });

  test("depletes across two lines of the same product", async () => {
    const { db, result } = await submit({
      lines: [
        makeLine({ qty: 3 }),
        makeLine({ qty: 4 }),
      ],
      methods: [makeMethod(70000)],
    });
    const id = right(result);
    const portions = portionsOf(db, id);
    expect(portions).toHaveLength(3);
    expect(portions.map((portion) => [portion.record_listing_qty, portion.record_listing_capital])).toEqual([
      [2, 1000],
      [1, 2000],
      [4, 2000],
    ]);
    expect(new Set(portions.map((portion) => portion.record_listing_group_id)).size).toBe(2);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 0, stock_capital: 2000 },
    ]);
    expect(recordOf(db, id).record_total).toBe(70000);
  });

  test("converts a listing unit into pcs and stores a per-pc price", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec(`
          INSERT INTO products (product_id, product_name, product_note, product_updated_at)
            VALUES ('p2', 'Paket', '', 1);
          INSERT INTO listings (
            listing_id, product_id, listing_name, listing_price, listing_unit,
            listing_kind, listing_updated_at
          ) VALUES ('l2', 'p2', 'Paket', 10000, 2, 'retail', 1);
          INSERT INTO stocks (
            stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
          ) VALUES ('z1', 'p2', 2, 1000, 1, 1), ('z2', 'p2', 5, 2000, 2, 2);
        `);
      },
      lines: [makeLine({ listingId: "l2", name: "Paket", price: 10000, qty: 3, unit: 2 })],
      methods: [makeMethod(30000)],
    });
    const id = right(result);
    const portions = portionsOf(db, id);
    expect(portions.map((portion) => ({
      qty: portion.record_listing_qty,
      price: portion.record_listing_price,
      unit: portion.record_listing_unit,
      total: portion.record_listing_total,
    }))).toEqual([
      { qty: 2, price: 5000, unit: 2, total: 10000 },
      { qty: 4, price: 5000, unit: 2, total: 20000 },
    ]);
    expect(recordOf(db, id).record_total).toBe(30000);
    expect(stocksOf(db).filter((stock) => stock.stock_id.startsWith("z"))).toEqual([
      { stock_id: "z1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "z2", stock_value: 1, stock_capital: 2000 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Manual products and listings
// ---------------------------------------------------------------------------

describe("TransactionService.submit — manual lines", () => {
  test("creates the product, listing and negative lot", async () => {
    const { db, result } = await submit({
      lines: [
        makeLine({ listingId: null, name: "  Barang Baru  ", code: " NEW-1 ", price: 5000, qty: 2 }),
      ],
      methods: [makeMethod(10000)],
    });
    const id = right(result);
    const product = db
      .query("SELECT product_id, product_name FROM products WHERE product_id <> 'p1'")
      .get() as { product_id: string; product_name: string };
    expect(product.product_name).toBe("Barang Baru");
    const listing = db
      .query(
        "SELECT listing_code, listing_code_kind, listing_price, listing_unit FROM listings WHERE listing_id <> 'l1'",
      )
      .get() as {
      listing_code: string;
      listing_code_kind: string;
      listing_price: number;
      listing_unit: number;
    };
    expect(listing).toEqual({
      listing_code: "new-1",
      listing_code_kind: "barcode",
      listing_price: 5000,
      listing_unit: 1,
    });
    const portion = portionsOf(db, id)[0];
    expect(portion.product_id).toBe(product.product_id);
    expect(portion.record_listing_qty).toBe(2);
    expect(portion.record_listing_capital).toBe(0);
    const lot = db
      .query("SELECT stock_value, stock_capital FROM stocks WHERE product_id = ?")
      .get(product.product_id) as { stock_value: number; stock_capital: number };
    expect(lot).toEqual({ stock_value: -2, stock_capital: 0 });
  });

  test("allows a manual line with no code", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ listingId: null, name: "Tanpa Kode", code: "", price: 5000, qty: 1 })],
      methods: [makeMethod(5000)],
    });
    const id = right(result);
    const listing = db
      .query("SELECT listing_code, listing_code_kind FROM listings WHERE listing_id <> 'l1'")
      .get() as { listing_code: string | null; listing_code_kind: string | null };
    expect(listing).toEqual({ listing_code: null, listing_code_kind: null });
    expect(portionsOf(db, id)[0].record_listing_capital).toBe(0);
  });

  test("creates a new product even when the name matches an existing one", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ listingId: null, name: "Kopi", code: "", price: 5000, qty: 1 })],
      methods: [makeMethod(5000)],
    });
    expect(result._tag).toBe("Right");
    const products = db.query("SELECT product_id FROM products").all() as { product_id: string }[];
    expect(products).toHaveLength(2);
    expect(products.map((row) => row.product_id)).toContain("p1");
    expect(count(db, "records")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Money shaping: extras, discounts, fixes
// ---------------------------------------------------------------------------

describe("TransactionService.submit — extras and discounts", () => {
  test("compounds percent extras in order and filters zero extras", async () => {
    const { db, result } = await submit({
      extras: [
        makeExtra("percent", 10, "Pajak"),
        makeExtra("percent", 10, "Servis"),
        makeExtra("number", 0, "Nol"),
      ],
      methods: [makeMethod(48400)],
    });
    const id = right(result);
    expect(recordOf(db, id).record_total).toBe(48400);
    expect(extrasOf(db, id)).toEqual([
      { record_extra_name: "Pajak", record_extra_value: 10, record_extra_eff: 4000, record_extra_kind: "percent" },
      { record_extra_name: "Servis", record_extra_value: 10, record_extra_eff: 4400, record_extra_kind: "percent" },
    ]);
  });

  test("supports a negative flat extra as a deduction", async () => {
    const { db, result } = await submit({
      extras: [makeExtra("number", -5000, "Diskon tambahan")],
      methods: [makeMethod(35000)],
    });
    const id = right(result);
    expect(recordOf(db, id).record_total).toBe(35000);
    expect(extrasOf(db, id)).toEqual([
      { record_extra_name: "Diskon tambahan", record_extra_value: -5000, record_extra_eff: -5000, record_extra_kind: "number" },
    ]);
  });

  test("stores discounts per portion with a shared group id and filters zero eff", async () => {
    const { db, result } = await submit({
      lines: [
        makeLine({
          discounts: [
            makeDiscount("percent", 10),
            makeDiscount("number", 1000),
            makeDiscount("percent", 0),
          ],
        }),
      ],
      methods: [makeMethod(35000)],
    });
    const id = right(result);
    expect(recordOf(db, id).record_sub_total).toBe(35000);
    expect(recordOf(db, id).record_total).toBe(35000);
    const discounts = discountsOf(db, id);
    expect(discounts).toHaveLength(4); // 2 discounts × 2 portions
    const groups = new Map<string, DiscountRow[]>();
    for (const discount of discounts) {
      const list = groups.get(discount.discount_group_id) ?? [];
      list.push(discount);
      groups.set(discount.discount_group_id, list);
    }
    expect(groups.size).toBe(2);
    expect([...groups.values()].map((list) => list.reduce((sum, row) => sum + row.discount_eff, 0)).sort((a, b) => b - a)).toEqual([
      4000,
      1000,
    ]);
    expect(portionsOf(db, id).map((portion) => portion.record_listing_total)).toEqual([17500, 17500]);
  });

  test("supports a pcs discount", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ discounts: [makeDiscount("pcs", 0.5)] })],
      methods: [makeMethod(35000)],
    });
    const id = right(result);
    expect(recordOf(db, id).record_total).toBe(35000);
    expect(discountsOf(db, id).map((row) => [row.discount_kind, row.discount_value])).toEqual([
      ["pcs", 0.5],
      ["pcs", 0.5],
    ]);
  });

  test("rounds pay and the grand total at fix 2 while storing full line precision", async () => {
    const { db, result } = await submit({
      lines: [makeLine({ price: 100.004, qty: 1 })],
      methods: [makeMethod(100.01)],
      fix: 2,
    });
    const id = right(result);
    const record = recordOf(db, id);
    expect(record.record_fix).toBe(2);
    expect(record.record_total).toBe(100.004);
    expect(record.record_pay).toBe(100.01);
    expect(record.record_rounding).toBe(0);
  });

  test("supports negative rounding", async () => {
    const { db, result } = await submit({
      rounding: -1000,
      methods: [makeMethod(39000)],
      fix: 2,
    });
    const id = right(result);
    const record = recordOf(db, id);
    expect(record.record_total).toBe(40000);
    expect(record.record_rounding).toBe(-1000);
    expect(record.record_pay).toBe(39000);
    expect(record.record_fix).toBe(2);
  });

  test("stores the note, mode and timestamps", async () => {
    const before = Date.now();
    const { db, result } = await submit({ note: "Catatan penjualan" });
    const id = right(result);
    const record = recordOf(db, id);
    expect(record.record_note).toBe("Catatan penjualan");
    expect(record.record_mode).toBe("incoming");
    expect(record.record_paid_at).toBeGreaterThanOrEqual(before);
    expect(record.record_updated_at).toBeGreaterThanOrEqual(before);
    expect(record.record_sync_at).toBeNull();
    expect(record.record_deleted_at).toBeNull();
    expect(record.record_credit_at).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

describe("TransactionService.submit — customer", () => {
  test("copies an existing customer's name and phone", async () => {
    const { db, result } = await submit({ customerId: "c1" });
    const id = right(result);
    expect(recordOf(db, id).record_customer_name).toBe("Siti");
    expect(recordOf(db, id).record_customer_phone).toBe("0811");
    expect(customersOf(db)).toHaveLength(1);
  });

  test("creates a typed new customer with its phone", async () => {
    const { db, result } = await submit({ customerName: "Budi", customerPhone: "0812" });
    const id = right(result);
    expect(recordOf(db, id).record_customer_name).toBe("Budi");
    expect(recordOf(db, id).record_customer_phone).toBe("0812");
    expect(customersOf(db).map((customer) => [customer.customer_name, customer.customer_phone])).toEqual([
      ["Budi", "0812"],
      ["Siti", "0811"],
    ]);
  });

  test("reuses an existing customer whose name matches case-insensitively", async () => {
    const { db, result } = await submit({ customerName: "siti", customerPhone: "0000" });
    const id = right(result);
    expect(recordOf(db, id).record_customer_name).toBe("Siti");
    expect(recordOf(db, id).record_customer_phone).toBe("0811");
    expect(customersOf(db)).toHaveLength(1);
  });

  test("writes empty customer fields when none is chosen", async () => {
    const { db, result } = await submit();
    const id = right(result);
    expect(recordOf(db, id).record_customer_name).toBe("");
    expect(recordOf(db, id).record_customer_phone).toBe("");
    expect(customersOf(db)).toHaveLength(1);
  });

  test("ignores a soft-deleted customer id even with pending text", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec("UPDATE customers SET customer_deleted_at = 1 WHERE customer_id = 'c1'");
      },
      customerId: "c1",
      customerName: "Budi",
      customerPhone: "0812",
    });
    const id = right(result);
    expect(recordOf(db, id).record_customer_name).toBe("");
    expect(recordOf(db, id).record_customer_phone).toBe("");
    expect(customersOf(db)).toHaveLength(1);
  });

  test("creates a new customer when the only name match is soft-deleted", async () => {
    const { db, result } = await submit({
      seed: (db) => {
        db.exec("UPDATE customers SET customer_deleted_at = 1 WHERE customer_id = 'c1'");
      },
      customerName: "Siti",
      customerPhone: "0000",
    });
    const id = right(result);
    expect(recordOf(db, id).record_customer_name).toBe("Siti");
    expect(recordOf(db, id).record_customer_phone).toBe("0000");
    const active = db
      .query(
        "SELECT customer_name, customer_phone FROM customers WHERE customer_deleted_at IS NULL",
      )
      .all() as { customer_name: string; customer_phone: string }[];
    expect(active).toEqual([{ customer_name: "Siti", customer_phone: "0000" }]);
    expect(customersOf(db)).toHaveLength(2);
  });

  test("ignores pending text when the customer id no longer exists", async () => {
    const { db, result } = await submit({
      customerId: "missing",
      customerName: "Budi",
      customerPhone: "0812",
    });
    const id = right(result);
    expect(recordOf(db, id).record_customer_name).toBe("");
    expect(recordOf(db, id).record_customer_phone).toBe("");
    expect(customersOf(db)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Draft lifecycle
// ---------------------------------------------------------------------------

describe("TransactionService.submit — lifecycle", () => {
  test("removes the draft after a successful submit", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [makeLine()]);
        yield* tx.methods.set(id, [makeMethod()]);
        const result = yield* Effect.either(tx.submit(id, { cashier: "Kasir" }));
        const drafts = yield* tx.get.drafts("incoming");
        return { result, drafts };
      }).pipe(Effect.provide(transactionLayer)),
    );
    expect(outcome.result._tag).toBe("Right");
    expect(outcome.drafts).toEqual([]);
    expect(count(db, "records")).toBe(1);
  });

  test("keeps the draft and stock when the record writer rejects it", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [
          makeLine({ listingId: null, name: "Budi", code: "DUP", price: 1000, qty: 1 }),
          makeLine({ listingId: null, name: "Siti", code: "dup", price: 1000, qty: 1 }),
        ]);
        yield* tx.methods.set(id, [makeMethod(2000)]);
        const result = yield* Effect.either(tx.submit(id, { cashier: "Kasir" }));
        const kept = yield* tx.get.byId(id);
        yield* tx.delete.byId(id);
        return { result, kept };
      }).pipe(Effect.provide(transactionLayer)),
    );
    expectTransactionMessage(outcome.result, "lebih dari satu");
    expect(outcome.kept.listings).toHaveLength(2);
    expect(count(db, "records")).toBe(0);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 2, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 5, stock_capital: 2000 },
    ]);
  });

  test("keeps the draft when payment is short", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    const kept = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [makeLine()]);
        yield* tx.methods.set(id, [makeMethod(1000)]);
        const result = yield* Effect.either(tx.submit(id, { cashier: "Kasir" }));
        const draft = yield* tx.get.byId(id);
        yield* tx.delete.byId(id);
        return { result, draft };
      }).pipe(Effect.provide(transactionLayer)),
    );
    expectSubmitKind(kept.result, "payment");
    expect(kept.draft.listings).toHaveLength(1);
    expect(count(db, "records")).toBe(0);
  });

  test("moves tx images into the record and deletes the tx row", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    db.exec(`
      INSERT INTO tx_records (
        tx_record_id, tx_record_order, tx_record_flag, tx_record_title, tx_record_mode
      ) VALUES ('d1', 0, 0, 'Kopi', 'incoming');
      INSERT INTO tx_listings (
        tx_listing_id, tx_record_id, listing_id, tx_listing_name,
        tx_listing_price, tx_listing_unit, tx_listing_qty
      ) VALUES ('tl1', 'd1', 'l1', 'Kopi', 10000, 1, 4);
      INSERT INTO tx_methods (tx_method_id, tx_record_id, method_id, tx_method_value)
        VALUES ('tm1', 'd1', 'cash', 40000);
      INSERT INTO tx_images (tx_image_id, tx_image_order, tx_image_name, tx_image_mime, tx_record_id)
        VALUES ('ti1', 0, 'photo.png', 'image/png', 'd1');
    `);
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        return yield* Effect.either(tx.submit("d1", { cashier: "Kasir" }));
      }).pipe(Effect.provide(transactionLayer)),
    );
    const id = right(result);
    const images = db
      .query(
        `SELECT record_image_order, record_image_name, record_image_mime
         FROM record_images WHERE record_id = ?`,
      )
      .all(id);
    expect(images).toEqual([
      { record_image_order: 0, record_image_name: "photo.png", record_image_mime: "image/png" },
    ]);
    expect(count(db, "tx_images")).toBe(0);
    expect(count(db, "tx_records")).toBe(0);
  });

  test("restores the record's images when a submit is cancelled", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    db.exec(`
      INSERT INTO tx_records (
        tx_record_id, tx_record_order, tx_record_flag, tx_record_title, tx_record_mode
      ) VALUES ('d1', 0, 0, 'Kopi', 'incoming');
      INSERT INTO tx_listings (
        tx_listing_id, tx_record_id, listing_id, tx_listing_name,
        tx_listing_price, tx_listing_unit, tx_listing_qty
      ) VALUES ('tl1', 'd1', 'l1', 'Kopi', 10000, 1, 4);
      INSERT INTO tx_methods (tx_method_id, tx_record_id, method_id, tx_method_value)
        VALUES ('tm1', 'd1', 'cash', 40000);
      INSERT INTO tx_images (tx_image_id, tx_image_order, tx_image_name, tx_image_mime, tx_record_id)
        VALUES ('ti1', 0, 'photo.png', 'image/png', 'd1');
    `);
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const recordId = yield* tx.submit("d1", { cashier: "Kasir" });
        const draftId = yield* tx.unsubmit(recordId);
        const draft = yield* tx.get.byId(draftId);
        return { recordId, draftId, draft };
      }).pipe(Effect.provide(transactionLayer)),
    );
    expect(outcome.draft.images).toEqual([
      { id: expect.any(String), order: 0, name: "photo.png", mime: "image/png" },
    ]);
    expect(
      db.query("SELECT tx_image_name FROM tx_images WHERE tx_record_id = ?").get(outcome.draftId),
    ).toEqual({ tx_image_name: "photo.png" });
    expect(
      (db.query("SELECT record_deleted_at FROM records WHERE record_id = ?").get(outcome.recordId) as {
        record_deleted_at: number | null;
      }).record_deleted_at,
    ).not.toBeNull();
  });

  test("settles a submitted credit with its zero method row", async () => {
    const { db, transactionLayer, recordLayer } = setup();
    seed(db);
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const record = yield* RecordService;
        const id = yield* tx.add.new("outcoming");
        yield* tx.listings.set(id, [makeLine()]);
        yield* tx.methods.set(id, [
          makeMethod(10000),
          makeMethod(30000, "qris"),
        ]);
        const recordId = yield* tx.submit(id, { cashier: "Kasir", credit: true });
        yield* record.set.payCredit(recordId, { pay: 40000, rounding: 0 });
        return yield* record.get.byId(recordId);
      }).pipe(Effect.provide(Layer.merge(transactionLayer, recordLayer))),
    );
    expect(outcome.paidAt).not.toBeNull();
    expect(outcome.creditAt).not.toBeNull();
    expect(outcome.pay).toBe(40000);
    expect(outcome.methods).toHaveLength(2);
    expect(outcome.methods.map((method) => method.pay)).toEqual([40000, 0]);
  });

  test("still commits when the post-commit product refresh fails", async () => {
    const { db, layer } = makeTestDatabase();
    seed(db);
    const failingProduct = Layer.succeed(
      ProductService,
      {
        refresh: () => Effect.fail(new ProductError({ message: "refresh failed" })),
        refreshMany: () => Effect.fail(new ProductError({ message: "refresh failed" })),
      } as unknown as Context.Tag.Service<typeof ProductService>,
    );
    const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(failingProduct));
    const transactionLayer = TransactionLive.pipe(
      Layer.provide(layer),
      Layer.provide(recordLayer),
    );
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [makeLine()]);
        yield* tx.methods.set(id, [makeMethod()]);
        return yield* Effect.either(tx.submit(id, { cashier: "Kasir" }));
      }).pipe(Effect.provide(transactionLayer)),
    );
    expect(result._tag).toBe("Right");
    expect(count(db, "records")).toBe(1);
    expect(stocksOf(db)).toEqual([
      { stock_id: "s1", stock_value: 0, stock_capital: 1000 },
      { stock_id: "s2", stock_value: 3, stock_capital: 2000 },
    ]);
  });

  test("a commit re-reads only the products its lines touched", async () => {
    const { db, layer } = makeTestDatabase();
    seed(db);
    const fullReads: string[] = [];
    const boundedReads: string[][] = [];
    const recordingProduct = Layer.succeed(
      ProductService,
      {
        refresh: () =>
          Effect.sync(() => {
            fullReads.push("all");
          }),
        refreshMany: (ids: string[]) =>
          Effect.sync(() => {
            boundedReads.push(ids);
          }),
      } as unknown as Context.Tag.Service<typeof ProductService>,
    );
    const recordLayer = RecordLive.pipe(Layer.provide(layer), Layer.provide(recordingProduct));
    const transactionLayer = TransactionLive.pipe(
      Layer.provide(layer),
      Layer.provide(recordLayer),
    );
    const recordId = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [makeLine()]);
        yield* tx.methods.set(id, [makeMethod()]);
        return yield* tx.submit(id, { cashier: "Kasir" });
      }).pipe(Effect.provide(transactionLayer)),
    );
    expect(recordId).toEqual(expect.any(String));
    // One product on the sale: one product re-read, not the whole catalogue.
    expect(boundedReads).toEqual([["p1"]]);
    expect(fullReads).toHaveLength(0);
  });

  test("a second submit of the same draft fails because the first removed it", async () => {
    const { db, result, second } = await submit({ secondSubmit: true });
    expect(result._tag).toBe("Right");
    expect(second).not.toBeNull();
    if (second !== null) expectSubmitKind(second, "empty");
    expect(count(db, "records")).toBe(1);
  });

  test("leaves another open draft alone", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const keep = yield* tx.add.new("incoming");
        const submitId = yield* tx.add.new("incoming");
        yield* tx.listings.set(submitId, [makeLine()]);
        yield* tx.methods.set(submitId, [makeMethod()]);
        const result = yield* Effect.either(tx.submit(submitId, { cashier: "Kasir" }));
        const drafts = yield* tx.get.drafts("incoming");
        yield* tx.delete.byId(keep);
        return { result, drafts };
      }).pipe(Effect.provide(transactionLayer)),
    );
    expect(outcome.result._tag).toBe("Right");
    expect(outcome.drafts.map((draft) => draft.id)).toHaveLength(1);
    expect(count(db, "records")).toBe(1);
  });

  test("leaves a stored draft parked while another cart submits", async () => {
    const { db, transactionLayer } = setup();
    seed(db);
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* TransactionService;
        const storedId = yield* tx.add.new("incoming");
        yield* tx.set.store(storedId);
        const submitId = yield* tx.add.new("incoming");
        yield* tx.listings.set(submitId, [makeLine()]);
        yield* tx.methods.set(submitId, [makeMethod()]);
        const result = yield* Effect.either(tx.submit(submitId, { cashier: "Kasir" }));
        const drafts = yield* tx.get.drafts("incoming");
        yield* tx.delete.byId(storedId);
        return { result, drafts };
      }).pipe(Effect.provide(transactionLayer)),
    );
    expect(outcome.result._tag).toBe("Right");
    expect(outcome.drafts).toHaveLength(1);
    expect(outcome.drafts[0].id).toBeDefined();
    expect(count(db, "records")).toBe(1);
  });
});
