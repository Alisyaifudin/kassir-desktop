import { Effect, Layer, SubscriptionRef } from "effect";
import Decimal from "decimal.js";
import {
  RECORD_FLAG_ADJUSTMENT,
  RecordError,
  RecordService,
  type DebtRecord,
  type Discount,
  type DiscountKind,
  type ListingHistoryEntry,
  type ListingHistoryPage,
  type Record,
  type RecordExtra,
  type RecordFull,
  type RecordListing,
  type RecordMethod,
  type RecordMirrorInput,
  type RecordMode,
  type RecordSummary,
  type ValueKind,
} from ".";
import type { MethodKind } from "~/lib/constants";
import type { DbError, Statement } from "../db";
import { DatabaseService } from "../db";
import { NotFound } from "~/lib/effect-error";
import { ProductService } from "../product";
import { roundToFix } from "./round";
import { insertDiscounts, insertMethod, insertPortion, insertRecordStatement } from "./sql/insert";
import {
  consumeStatements,
  depleteLots,
  drainStatements,
  receiveAtCapital,
  receivePortion,
  receiveStatements,
  touchProduct,
  type StockLot,
} from "../product/stock-sql";
import { generateId } from "~/lib/random";
import { roundMoney } from "~/lib/purchase";
import { allocateCapital } from "./capital";
import { validateRecordLine } from "./validate-line";

type SummaryRow = {
  mode: RecordMode;
  count: number;
  total: number;
};

type DebtRow = {
  record_id: string;
  record_credit_at: number;
  record_note: string;
  record_fix: number;
  record_total: number;
};

type RecordRow = {
  record_id: string;
  record_created_at: number;
  record_paid_at: number | null;
  record_rounding: number;
  record_credit_at: number | null;
  record_cashier: string;
  record_mode: RecordMode;
  record_pay: number;
  record_note: string;
  record_fix: number;
  record_customer_name: string;
  record_customer_phone: string;
  record_supplier_id: string | null;
  record_supplier_name: string;
  record_sub_total: number;
  record_total: number;
  record_updated_at: number;
  record_sync_at: number | null;
  record_deleted_at: number | null;
  record_pair_id: string | null;
};

type MethodRow = {
  record_method_id: string;
  record_id: string;
  method_id: string;
  record_method_pay: number;
  method_name: string | null;
  method_kind: MethodKind;
};

type ListingHistoryRow = {
  record_id: string;
  record_paid_at: number;
  record_mode: RecordMode;
  record_listing_id: string;
  record_listing_name: string;
  record_listing_price: number;
  record_listing_qty: number;
  total_count: number;
};

type ListingRow = {
  record_listing_id: string;
  record_listing_group_id: string;
  product_event_id: string | null;
  stock_id: string | null;
  product_id: string | null;
  record_listing_name: string;
  record_listing_kind: string;
  record_listing_unit: number;
  record_listing_price: number;
  record_listing_qty: number;
  record_listing_capital: number;
  record_listing_total: number;
};

type DiscountRow = {
  discount_id: string;
  discount_group_id: string;
  record_listing_group_id: string;
  discount_kind: DiscountKind;
  discount_value: number;
  discount_eff: number;
};

type ExtraRow = {
  record_extra_id: string;
  record_extra_name: string;
  record_extra_value: number;
  record_extra_eff: number;
  record_extra_kind: ValueKind;
  record_extra_flag: number;
};

type MoveRow = {
  record_listing_name: string;
  record_listing_qty: number;
  record_listing_capital: number;
  product_id: string;
  listing_unit: number;
};

type LotRow = {
  stock_id: string;
  stock_value: number;
  stock_capital: number;
};

type CustomerRow = {
  customer_name: string;
  customer_phone: string;
};

type SupplierRow = {
  supplier_id: string;
  supplier_name: string;
};

type ListingLinkRow = {
  listing_id: string;
  product_id: string;
  listing_unit: number;
};

function insertProductRow(productId: string, name: string, now: number): Statement {
  return {
    sql: `INSERT INTO products (
        product_id, product_name, product_note, product_updated_at, product_sync_at
      ) VALUES ($1, $2, '', $3, NULL)`,
    bindings: [productId, name, now],
  };
}

function insertListingRow(
  listingId: string,
  productId: string,
  input: { name: string; price: number; unit: number; kind: string; code: string | null },
  now: number,
): Statement {
  return {
    sql: `INSERT INTO listings (
        listing_id, product_id, listing_name, listing_price, listing_unit,
        listing_kind, listing_code, listing_updated_at, listing_sync_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)`,
    bindings: [
      listingId,
      productId,
      input.name,
      input.price,
      input.unit,
      input.kind,
      input.code,
      now,
    ],
  };
}

type TouchedLot = {
  stockId: string;
  productId: string;
  /** The lot as its surviving journal leaves it; null when nothing survives. */
  restored: { value: number; capital: number } | null;
  /** The lot's own row, which is the truth when the journal says nothing. */
  current: { value: number; capital: number };
  /** What this record did to the lot — a positive delta is what created it. */
  delta: number;
};

// Records are a queried domain: ~64k rows, always read by range, so they get
// query Effects plus a `revision` counter instead of a full-list `SubscriptionRef`.
// `ROUND(…, record_fix)` reproduces the per-record precision the legacy
// `count.total` applied before summing.
const RECORD_DATE = "COALESCE(record_paid_at, record_credit_at, record_created_at)";

const SELECT_SUMMARY = `
  SELECT
    record_mode AS mode,
    COUNT(*) AS count,
    SUM(ROUND(record_total + record_rounding, record_fix)) AS total
  FROM records
  WHERE record_deleted_at IS NULL
    AND ${RECORD_DATE} >= $1 AND ${RECORD_DATE} < $2
  GROUP BY record_mode`;

const RECORD_COLUMNS = `
  record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
  record_cashier, record_mode, record_pay, record_note, record_fix,
  record_customer_name, record_customer_phone, record_supplier_id,
  record_supplier_name, record_sub_total, record_total, record_updated_at,
  record_sync_at, record_deleted_at, record_pair_id`;

// `record_listings` has no ordering column; SQLite's implicit rowid order is
// insertion order, which is what a receipt wants. A line is stored as one row
// per lot portion; the read model regroups them by `record_listing_group_id`.
const SELECT_LISTINGS = `
  SELECT
    rl.record_listing_id, rl.record_listing_group_id, rl.product_event_id,
    pe.stock_id,
    rl.product_id, rl.record_listing_name, rl.record_listing_kind,
    rl.record_listing_unit, rl.record_listing_price, rl.record_listing_qty,
    rl.record_listing_capital, rl.record_listing_total
  FROM record_listings rl
  LEFT JOIN product_events pe ON pe.product_event_id = rl.product_event_id
  WHERE rl.record_id = $1
  ORDER BY rl.rowid ASC`;

const SELECT_DISCOUNTS = `
  SELECT d.discount_id, d.discount_group_id, rl.record_listing_group_id,
         d.discount_kind, d.discount_value, d.discount_eff
  FROM discounts d
  JOIN record_listings rl ON rl.record_listing_id = d.record_listing_id
  WHERE rl.record_id = $1`;

const SELECT_EXTRAS = `
  SELECT
    record_extra_id, record_extra_name, record_extra_value, record_extra_eff,
    record_extra_kind, record_extra_flag
  FROM record_extras
  WHERE record_id = $1`;

const SELECT_METHODS_FOR = (placeholders: string) => `
  SELECT
    rm.record_method_id, rm.record_id, rm.method_id, rm.record_method_pay,
    m.method_name, m.method_kind
  FROM record_methods rm
  JOIN methods m ON m.method_id = rm.method_id
  WHERE rm.record_id IN (${placeholders})
  ORDER BY rm.rowid`;

// `COUNT(*) OVER ()` counts the whole match set before LIMIT trims the page, so a
// single query answers both "here are the first N" and "there are M of them".
// Without it the page would have to re-ask for the count on every fetch.
const SELECT_LISTING_HISTORY = `
  SELECT
    r.record_id,
    COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at) AS record_paid_at,
    r.record_mode,
    rl.record_listing_id, rl.record_listing_name, rl.record_listing_price,
    rl.record_listing_qty,
    COUNT(*) OVER () AS total_count
  FROM record_listings rl
  JOIN records r ON r.record_id = rl.record_id
  WHERE r.record_deleted_at IS NULL
    AND COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at) >= $1
    AND COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at) < $2
    AND r.record_mode = $3
    AND rl.record_listing_name LIKE $4 ESCAPE '\\'
  ORDER BY COALESCE(r.record_paid_at, r.record_credit_at, r.record_created_at) DESC
  LIMIT $5`;

function dbErrorToRecordError(error: DbError): RecordError {
  return new RecordError({ message: error.message });
}

function rowToMethod(row: MethodRow): RecordMethod {
  return {
    id: row.record_method_id,
    methodId: row.method_id,
    pay: row.record_method_pay,
    name: row.method_name,
    kind: row.method_kind,
  };
}

function rowToRecord(row: RecordRow, methods: RecordMethod[]): Record {
  // Pay and the grand total are the fix-rounded figures the cashier saw; the
  // change is taken between them, so it cannot disagree with the receipt.
  const grandTotal = roundToFix(row.record_total + row.record_rounding, row.record_fix);
  return {
    id: row.record_id,
    createdAt: row.record_created_at,
    date: row.record_paid_at ?? row.record_credit_at ?? row.record_created_at,
    paidAt: row.record_paid_at,
    creditAt: row.record_credit_at,
    rounding: row.record_rounding,
    isCredit: row.record_paid_at === null && row.record_credit_at !== null,
    cashier: row.record_cashier,
    mode: row.record_mode,
    pay: row.record_pay,
    note: row.record_note,
    fix: row.record_fix,
    customer: { name: row.record_customer_name, phone: row.record_customer_phone },
    supplier: {
      id: row.record_supplier_id,
      name: row.record_supplier_name,
    },
    subTotal: roundToFix(row.record_sub_total, row.record_fix),
    total: roundToFix(row.record_total, row.record_fix),
    grandTotal,
    change: roundToFix(row.record_pay - grandTotal, row.record_fix),
    methods,
    updatedAt: row.record_updated_at,
    syncAt: row.record_sync_at,
    deletedAt: row.record_deleted_at,
    pairId: row.record_pair_id,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * The statements for a `dual` charge's twin: an extras-only `outcoming` record,
 * settled in cash, flagged `RECORD_FLAG_ADJUSTMENT` so the stock and profit
 * reads that assume "a record sold something" skip it, and linked to the sale
 * both ways through `record_pair_id`.
 *
 * Its only lines are the dual extras, so `sub_total`, `total` and `pay` are all
 * their sum — the extras carry the amount the sale actually charged, which is
 * why a `percent` dual keeps its rupiah on a record with no subtotal of its
 * own. No rounding, no customer, no supplier: the money is the whole fact.
 *
 * `null` when the twin would book nothing — no dual extra survived the
 * zero-filter, or the net came out zero or negative. A deduction-heavy set is
 * not a purchase, and the same rule `add.adjustment` enforces applies here: no
 * record is stored with a total of zero or less. The sale is unaffected; only
 * the twin is dropped.
 */
function mirrorStatements(
  mirror: RecordMirrorInput | undefined,
  recordId: string,
  now: number,
): Statement[] | null {
  if (mirror === undefined) return null;
  const extras = mirror.extras.filter((extra) => extra.eff !== 0);
  if (extras.length === 0) return null;
  const total = extras.reduce((sum, extra) => sum.plus(extra.eff), new Decimal(0));
  if (!total.gt(0)) return null;

  const mirrorId = generateId();
  const amount = total.toNumber();
  const statements: Statement[] = [
    insertRecordStatement(
      mirrorId,
      {
        createdAt: now,
        paidAt: now,
        creditAt: null,
        rounding: 0,
        cashier: mirror.cashier,
        mode: mirror.mode,
        pay: amount,
        note: mirror.note,
        fix: mirror.fix,
        customer: { name: "", phone: "" },
        supplier: { id: null, name: "" },
        subTotal: amount,
        total: amount,
        flag: RECORD_FLAG_ADJUSTMENT,
      },
      now,
    ),
  ];
  for (const extra of extras) {
    statements.push({
      sql: `INSERT INTO record_extras (
          record_extra_id, record_extra_name, record_id,
          record_extra_value, record_extra_eff, record_extra_kind,
          record_extra_flag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      bindings: [
        generateId(),
        extra.name,
        mirrorId,
        extra.value,
        extra.eff,
        extra.kind,
        extra.flag,
      ],
    });
  }
  statements.push(insertMethod(mirrorId, mirror.methodId, amount));
  // The links go last, after both rows exist: a self-reference inserted with
  // the row would have nothing to point at yet while foreign_keys is on.
  statements.push(
    {
      sql: "UPDATE records SET record_pair_id = $1 WHERE record_id = $2",
      bindings: [mirrorId, recordId],
    },
    {
      sql: "UPDATE records SET record_pair_id = $1 WHERE record_id = $2",
      bindings: [recordId, mirrorId],
    },
  );
  return statements;
}

// The lines a delete has to compensate for: only those pointing at a catalog
// listing have stock behind them. `listing_unit` converts the line's qty into
// base pcs, which is the unit `stocks` counts in.
const SELECT_MOVES = `
  SELECT rl.record_listing_name, rl.record_listing_qty, rl.record_listing_capital,
         rl.product_id, rl.record_listing_unit AS listing_unit
  FROM record_listings rl
  WHERE rl.record_id = $1 AND rl.product_id IS NOT NULL`;

// A credit record is outstanding until it gets a paid_at, so this is the debt
// list. Legacy phrasing kept `record_total`, which is what is owed.
const SELECT_DEBT = `
  SELECT record_id, record_credit_at, record_note, record_fix, record_total
  FROM records
  WHERE record_credit_at IS NOT NULL
    AND record_paid_at IS NULL
    AND record_deleted_at IS NULL
  ORDER BY record_credit_at DESC`;

const SELECT_LOTS = `
  SELECT stock_id, stock_value, stock_capital
  FROM stocks
  WHERE product_id = $1
  ORDER BY stock_created_at ASC, stock_id ASC`;

// What a lot is worth once this record's events are struck from the journal:
// value is what remains, capital the newest of the remaining events.
const SELECT_SURVIVING_EVENTS = `
  SELECT product_event_value AS value, product_event_capital AS capital
  FROM product_events
  WHERE stock_id = $1 AND (record_id IS NULL OR record_id <> $2)
  ORDER BY product_event_created_at ASC, product_event_id ASC`;

// The lots a record moved, with the lot's own row alongside: a lot seeded before
// the journal reached it (the migration wrote `stocks` directly) has no events of
// its own to replay, and its row is then the only thing that knows its balance.
const SELECT_TOUCHED_LOTS = `
  SELECT DISTINCT pe.stock_id, pe.product_id, s.stock_value, s.stock_capital,
    (SELECT COALESCE(SUM(e.product_event_value), 0) FROM product_events e
      WHERE e.stock_id = pe.stock_id AND e.record_id = $1) AS record_delta
  FROM product_events pe
  JOIN stocks s ON s.stock_id = pe.stock_id
  WHERE pe.record_id = $1`;

// Which products this record's movement is journaled against. A line whose
// product is missing from this set predates the journal and carries its movement
// baked into the aggregate instead — see `delete`.
const SELECT_JOURNALED_PRODUCTS = `
  SELECT DISTINCT product_id FROM product_events WHERE record_id = $1`;

// A catalog listing an imported line can still point at, with the product and
// the unit that turn its qty into pcs. A deleted listing links to nothing.
const SELECT_LISTING_LINK = `
  SELECT listing_id, product_id, listing_unit
  FROM listings
  WHERE listing_id = $1 AND listing_deleted_at IS NULL`;

/**
 * Groups the per-portion rows back into the lines the UI and receipt show.
 * `qty`/`total` sum, `capital` is qty-weighted, and the duplicated discounts are
 * merged by `discount_group_id`.
 */
function regroupListings(
  rows: ListingRow[],
  discountById: Map<string, Discount>,
  discountOrder: Map<string, string[]>,
): RecordListing[] {
  const groups = new Map<string, ListingRow[]>();
  const order: string[] = [];
  for (const row of rows) {
    const group = row.record_listing_group_id;
    const list = groups.get(group);
    if (list === undefined) {
      groups.set(group, [row]);
      order.push(group);
    } else {
      list.push(row);
    }
  }

  return order.map((id) => {
    const portions = groups.get(id) ?? [];
    const first = portions[0];
    let qty = 0;
    let total = 0;
    let capitalValue = 0;
    for (const portion of portions) {
      qty += portion.record_listing_qty;
      total += portion.record_listing_total;
      capitalValue += portion.record_listing_capital * portion.record_listing_qty;
    }
    const discountIds = discountOrder.get(id) ?? [];
    return {
      id,
      productId: portions.find((portion) => portion.product_id !== null)?.product_id ?? null,
      name: first.record_listing_name,
      kind: first.record_listing_kind,
      unit: first.record_listing_unit,
      price: first.record_listing_price,
      qty,
      capital: qty > 0 ? capitalValue / qty : first.record_listing_capital,
      total,
      discounts: discountIds.flatMap((discountId) => {
        const discount = discountById.get(discountId);
        return discount === undefined ? [] : [{ ...discount }];
      }),
      portions: portions.map((portion) => ({
        id: portion.record_listing_id,
        productEventId: portion.product_event_id,
        stockId: portion.stock_id,
        productId: portion.product_id,
        unit: portion.record_listing_unit,
        qty: portion.record_listing_qty,
        capital: portion.record_listing_capital,
        total: portion.record_listing_total,
      })),
    };
  });
}

export const RecordLive = Layer.effect(
  RecordService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const product = yield* ProductService;

    // Bumped after every write so queried pages re-read. Seeded at 0 so a page
    // has a stable key before the first write.
    const revisionRef = yield* SubscriptionRef.make<number>(0);

    function methodsByRecord(
      recordIds: readonly string[],
    ): Effect.Effect<Map<string, RecordMethod[]>, RecordError> {
      if (recordIds.length === 0) {
        return Effect.succeed(new Map<string, RecordMethod[]>());
      }
      const placeholders = recordIds.map((_, index) => `$${index + 1}`).join(", ");
      return db.selectMany<MethodRow>(SELECT_METHODS_FOR(placeholders), [...recordIds]).pipe(
        Effect.mapError(dbErrorToRecordError),
        Effect.map((rows) => {
          const grouped = new Map<string, RecordMethod[]>();
          for (const row of rows) {
            const list = grouped.get(row.record_id);
            const method = rowToMethod(row);
            if (list === undefined) grouped.set(row.record_id, [method]);
            else list.push(method);
          }
          return grouped;
        }),
      );
    }

    function debt(): Effect.Effect<DebtRecord[], RecordError> {
      return db.selectMany<DebtRow>(SELECT_DEBT).pipe(
        Effect.mapError(dbErrorToRecordError),
        Effect.map((rows) =>
          rows.map(
            (row): DebtRecord => ({
              id: row.record_id,
              paidAt: row.record_credit_at,
              creditAt: row.record_credit_at,
              note: row.record_note,
              fix: row.record_fix,
              total: row.record_total,
            }),
          ),
        ),
      );
    }

    function byRange(
      start: number,
      end: number,
      query?: string,
    ): Effect.Effect<Record[], RecordError> {
      return Effect.gen(function* () {
        const trimmed = query?.trim() ?? "";
        const bindings: (number | string)[] = [start, end];
        // TODO: a `dual` charge's twin lives in this same table, flagged
        // RECORD_FLAG_ADJUSTMENT, so `/records` lists it as a goods-less
        // `outcoming` row beside the sale it belongs to. The filter below is
        // deliberately absent until the list decides how a pair should read —
        // see FLAGS.md. Analytics already skips `record_flag & 1`.
        let sql = `
          SELECT ${RECORD_COLUMNS} FROM records
          WHERE record_deleted_at IS NULL
            AND ${RECORD_DATE} >= $1 AND ${RECORD_DATE} < $2`;
        if (trimmed !== "") {
          bindings.push(`%${escapeLike(trimmed)}%`);
          sql += `
            AND EXISTS (
              SELECT 1 FROM record_listings rl
              WHERE rl.record_id = records.record_id
                AND rl.record_listing_name LIKE $3 ESCAPE '\\'
            )`;
        }
        sql += ` ORDER BY ${RECORD_DATE} ASC`;

        const rows = yield* db
          .selectMany<RecordRow>(sql, bindings)
          .pipe(Effect.mapError(dbErrorToRecordError));

        const grouped = yield* methodsByRecord(rows.map((row) => row.record_id));
        return rows.map((row) => rowToRecord(row, grouped.get(row.record_id) ?? []));
      });
    }

    function byId(id: string): Effect.Effect<RecordFull, RecordError | NotFound> {
      return Effect.gen(function* () {
        const row = yield* db
          .selectOne<RecordRow>(
            `SELECT ${RECORD_COLUMNS} FROM records
             WHERE record_id = $1 AND record_deleted_at IS NULL`,
            [id],
          )
          .pipe(Effect.catchTag("DbError", (error) => Effect.fail(dbErrorToRecordError(error))));
        const [methodRows, listingRows, discountRows, extraRows] = yield* Effect.all([
          db.selectMany<MethodRow>(SELECT_METHODS_FOR("$1"), [id]),
          db.selectMany<ListingRow>(SELECT_LISTINGS, [id]),
          db.selectMany<DiscountRow>(SELECT_DISCOUNTS, [id]),
          db.selectMany<ExtraRow>(SELECT_EXTRAS, [id]),
        ]).pipe(Effect.mapError(dbErrorToRecordError));
        const discountById = new Map<string, Discount>();
        const discountOrder = new Map<string, string[]>();
        for (const discount of discountRows) {
          const group = discount.record_listing_group_id;
          const order = discountOrder.get(group) ?? [];
          const existing = discountById.get(discount.discount_group_id);
          if (existing === undefined) {
            discountById.set(discount.discount_group_id, {
              id: discount.discount_group_id,
              kind: discount.discount_kind,
              value: discount.discount_value,
              eff: discount.discount_eff,
            });
            order.push(discount.discount_group_id);
          } else {
            // The per-portion copies of one entered discount.
            existing.eff += discount.discount_eff;
          }
          discountOrder.set(group, order);
        }

        const listings = regroupListings(listingRows, discountById, discountOrder);

        const extras: RecordExtra[] = extraRows.map((extra) => ({
          id: extra.record_extra_id,
          name: extra.record_extra_name,
          value: extra.record_extra_value,
          eff: extra.record_extra_eff,
          kind: extra.record_extra_kind,
          flag: extra.record_extra_flag,
        }));

        return {
          ...rowToRecord(row, methodRows.map(rowToMethod)),
          listings,
          extras,
        };
      });
    }

    /** The row a write needs before it can decide anything. */
    function readRecord(id: string): Effect.Effect<RecordRow, RecordError> {
      return db
        .selectOne<RecordRow>(
          `SELECT ${RECORD_COLUMNS} FROM records
           WHERE record_id = $1 AND record_deleted_at IS NULL`,
          [id],
        )
        .pipe(
          Effect.catchTag("DbError", (error) => Effect.fail(dbErrorToRecordError(error))),
          Effect.catchTag("NotFound", () =>
            Effect.fail(new RecordError({ message: "Catatan tidak ditemukan" })),
          ),
        );
    }

    /**
     * Every lot this record moved, each carrying what it is worth once the
     * record's own events are gone. Read up front because the write that uses it
     * is one transaction.
     */
    function touchedLots(recordId: string): Effect.Effect<TouchedLot[], RecordError> {
      return Effect.gen(function* () {
        const touched = yield* db
          .selectMany<{
            stock_id: string;
            product_id: string;
            stock_value: number;
            stock_capital: number;
            record_delta: number;
          }>(SELECT_TOUCHED_LOTS, [recordId])
          .pipe(Effect.mapError(dbErrorToRecordError));

        const lots: TouchedLot[] = [];
        for (const lot of touched) {
          const surviving = yield* db
            .selectMany<{
              value: number;
              capital: number;
            }>(SELECT_SURVIVING_EVENTS, [lot.stock_id, recordId])
            .pipe(Effect.mapError(dbErrorToRecordError));
          let value = 0;
          for (const event of surviving) value += event.value;
          const last = surviving[surviving.length - 1];
          lots.push({
            stockId: lot.stock_id,
            productId: lot.product_id,
            restored: last === undefined || last === null ? null : { value, capital: last.capital },
            current: { value: lot.stock_value, capital: lot.stock_capital },
            delta: lot.record_delta,
          });
        }
        return lots;
      });
    }

    /** A lot's row after this record's movement has been undone. */
    function restoredLot(lot: TouchedLot): StockLot | null {
      if (lot.restored !== null) {
        return { id: lot.stockId, value: lot.restored.value, capital: lot.restored.capital };
      }
      if (lot.delta > 0) return null;
      // No journal survives and the record only took stock out, which cannot
      // have created the lot: it predates the journal, and its row is the balance.
      return {
        id: lot.stockId,
        value: lot.current.value - lot.delta,
        capital: lot.current.capital,
      };
    }

    /** Statements putting one lot back where its surviving events leave it. */
    function restoreLot(lot: TouchedLot, now: number): Statement[] {
      const touched = touchProduct(lot.productId, now);
      const restored = restoredLot(lot);
      if (restored === null) {
        // Nothing survives and the record put stock *in*: this lot was the
        // record's own doing, so drop it rather than leave an empty husk.
        return [
          { sql: "DELETE FROM stocks WHERE stock_id = $1", bindings: [lot.stockId] },
          touched,
        ];
      }
      return [
        {
          sql: `UPDATE stocks SET
              stock_value = $1, stock_capital = $2, stock_updated_at = $3
            WHERE stock_id = $4`,
          bindings: [restored.value, restored.capital, now, lot.stockId],
        },
        touched,
      ];
    }

    /** FIFO order, which is the order a sale consumes lots in. */
    function readLots(productId: string): Effect.Effect<StockLot[], RecordError> {
      return db.selectMany<LotRow>(SELECT_LOTS, [productId]).pipe(
        Effect.mapError(dbErrorToRecordError),
        Effect.map((rows) =>
          rows.map((row) => ({
            id: row.stock_id,
            value: row.stock_value,
            capital: row.stock_capital,
          })),
        ),
      );
    }

    function bumpRevision(): Effect.Effect<void> {
      return SubscriptionRef.update(revisionRef, (current) => current + 1);
    }

    function commit(statements: Statement[]): Effect.Effect<void, RecordError> {
      return db.transaction(statements).pipe(Effect.mapError(dbErrorToRecordError));
    }

    function refreshProducts(): Effect.Effect<void, RecordError> {
      return product
        .refresh()
        .pipe(Effect.mapError((error) => new RecordError({ message: error.message })));
    }

    /**
     * The bounded form for a commit whose moved products are known: re-read only
     * those, so `Bayar` costs O(lines) instead of re-reading the catalogue.
     */
    function refreshProductsFor(ids: Iterable<string>): Effect.Effect<void, RecordError> {
      const list = [...ids];
      if (list.length === 0) return Effect.void;
      return product
        .refreshMany(list)
        .pipe(Effect.mapError((error) => new RecordError({ message: error.message })));
    }

    return {
      get: {
        debt,
        byRange,
        byId,
        listingHistory(input): Effect.Effect<ListingHistoryPage, RecordError> {
          return Effect.gen(function* () {
            const query = input.query.trim();
            // A blank search means "nothing typed yet", not "every line in the
            // range" — which for a month is ~137k rows.
            if (query === "") return { entries: [], total: 0 };

            const rows = yield* db
              .selectMany<ListingHistoryRow>(SELECT_LISTING_HISTORY, [
                input.start,
                input.end,
                input.mode,
                `%${escapeLike(query)}%`,
                Math.max(1, Math.trunc(input.limit)),
              ])
              .pipe(Effect.mapError(dbErrorToRecordError));

            return {
              entries: rows.map(
                (row): ListingHistoryEntry => ({
                  recordId: row.record_id,
                  paidAt: row.record_paid_at,
                  mode: row.record_mode,
                  id: row.record_listing_id,
                  name: row.record_listing_name,
                  qty: row.record_listing_qty,
                  price: row.record_listing_price,
                }),
              ),
              total: rows.length === 0 ? 0 : rows[0].total_count,
            };
          });
        },
        revision: revisionRef.changes,
      },
      add: {
        adjustment(input) {
          return Effect.gen(function* () {
            const extras = input.extras
              .map((extra) => ({ ...extra, name: extra.name.trim() }))
              .filter((extra) => extra.name !== "");

            if (extras.length === 0) {
              return yield* Effect.fail(
                new RecordError({ message: "Transaksi harus punya minimal satu baris" }),
              );
            }

            // The lines are the whole transaction: a flat `number` extra each,
            // so its effective value is its value. No goods, no rounding.
            const subTotal = Decimal.sum(...extras.map((extra) => extra.value)).toNumber();
            const total = subTotal;
            if (!(total > 0)) {
              return yield* Effect.fail(
                new RecordError({ message: "Total transaksi tidak boleh nol atau negatif" }),
              );
            }

            const now = Date.now();
            const recordId = generateId();
            const statements: Statement[] = [
              insertRecordStatement(
                recordId,
                {
                  createdAt: now,
                  paidAt: now,
                  creditAt: null,
                  rounding: 0,
                  cashier: input.cashier,
                  mode: input.mode,
                  pay: total,
                  note: input.note,
                  fix: 0,
                  customer: { name: "", phone: "" },
                  supplier: { id: null, name: "" },
                  subTotal,
                  total,
                  flag: RECORD_FLAG_ADJUSTMENT,
                },
                now,
              ),
            ];

            for (const extra of extras) {
              statements.push({
                sql: `INSERT INTO record_extras (
                    record_extra_id, record_extra_name, record_id,
                    record_extra_value, record_extra_eff, record_extra_kind
                  ) VALUES ($1, $2, $3, $4, $5, $6)`,
                bindings: [generateId(), extra.name, recordId, extra.value, extra.value, "number"],
              });
            }

            statements.push(insertMethod(recordId, input.methodId, total));

            yield* commit(statements);
            yield* bumpRevision();
            // Nothing moved stock, so the product aggregate stays valid.
            return recordId;
          });
        },
        external(input) {
          return Effect.gen(function* () {
            // The import file is the one place the app takes structured data
            // from outside its own writers, so it is held to the same numeric
            // rules as a live cart — an unvalidated line corrupts the stock
            // journal permanently (see ./validate-line.ts).
            if (input.listings.length === 0) {
              return yield* Effect.fail(
                new RecordError({ message: "Transaksi harus punya minimal satu barang" }),
              );
            }
            for (const line of input.listings) {
              const message = validateRecordLine(line);
              if (message !== null) {
                return yield* Effect.fail(
                  new RecordError({ message: `Catatan ${input.cashier || "impor"}: ${message}` }),
                );
              }
            }
            if (!(input.total > 0)) {
              return yield* Effect.fail(
                new RecordError({
                  message: `Catatan ${input.cashier || "impor"}: Total transaksi tidak boleh nol atau negatif`,
                }),
              );
            }

            const recordId = generateId();
            const now = Date.now();
            const statements: Statement[] = [
              insertRecordStatement(
                recordId,
                {
                  createdAt: input.paidAt,
                  paidAt: input.isCredit ? null : input.paidAt,
                  creditAt: input.isCredit ? input.paidAt : null,
                  rounding: input.rounding,
                  cashier: input.cashier,
                  mode: input.mode,
                  pay: input.pay,
                  note: input.note,
                  fix: input.fix,
                  customer: input.customer,
                  supplier: input.supplier ?? { id: null, name: "" },
                  subTotal: input.subTotal,
                  total: input.total,
                },
                now,
              ),
            ];
            // Lots are read once per product and depleted as lines take from them,
            // since the transaction has not run and a second read would hand out
            // stock an earlier line already took.
            const lotsByProduct = new Map<string, StockLot[]>();

            for (const line of input.listings) {
              // The entered line; its portions share this group id.
              const groupId = generateId();
              const link =
                line.listingId === null
                  ? null
                  : ((yield* db
                      .selectMany<{
                        listing_id: string;
                        product_id: string;
                        listing_unit: number;
                      }>(SELECT_LISTING_LINK, [line.listingId])
                      .pipe(Effect.mapError(dbErrorToRecordError)))[0] ?? null);

              // A line with no catalog link moves no stock: one portion, no event.
              if (link === null || line.qty * (link?.listing_unit ?? 1) === 0) {
                const portionId = generateId();
                statements.push(
                  insertPortion({
                    id: portionId,
                    groupId,
                    recordId,
                    productEventId: null,
                    productId: null,
                    name: line.name,
                    kind: line.kind,
                    unit: 1,
                    price: line.price,
                    qty: line.qty,
                    capital: line.capital,
                    total: line.total,
                  }),
                );
                statements.push(...insertDiscounts(portionId, line.discounts, 1));
                continue;
              }

              if (input.mode === "outcoming") {
                // A purchase arrives as its own cost lot; one portion points at it.
                // Listing capital is per listing unit; a lot's capital is per pc.
                const received = receivePortion(
                  link.product_id,
                  {
                    value: line.qty * link.listing_unit,
                    capital: line.capital / link.listing_unit,
                  },
                  now,
                  recordId,
                );
                statements.push(...received.statements);
                const portionId = generateId();
                statements.push(
                  insertPortion({
                    id: portionId,
                    groupId,
                    recordId,
                    productEventId: received.eventId,
                    productId: link.product_id,
                    name: line.name,
                    kind: line.kind,
                    unit: link.listing_unit,
                    price: line.price,
                    qty: line.qty,
                    capital: line.capital,
                    total: line.total,
                  }),
                );
                statements.push(...insertDiscounts(portionId, line.discounts, 1));
                continue;
              }

              // A sale consumes FIFO: one portion per lot it takes from.
              const pcs = line.qty * link.listing_unit;
              let lots = lotsByProduct.get(link.product_id);
              if (lots === undefined) {
                lots = yield* readLots(link.product_id);
              }
              const {
                statements: consumed,
                shortage,
                portions,
              } = consumeStatements(link.product_id, lots, pcs, now, "", recordId);
              if (shortage > 0) {
                return yield* Effect.fail(
                  new RecordError({ message: `Stok ${line.name} tidak mencukupi` }),
                );
              }
              statements.push(...consumed);
              const parts = portions.map((portion) => {
                const share = portion.pcs / pcs;
                const qty = portion.pcs / link.listing_unit;
                const id = generateId();
                statements.push(
                  insertPortion({
                    id,
                    groupId,
                    recordId,
                    productEventId: portion.eventId,
                    productId: link.product_id,
                    name: line.name,
                    kind: line.kind,
                    unit: link.listing_unit,
                    price: line.price,
                    qty,
                    capital: portion.capital * link.listing_unit,
                    total: line.total * share,
                  }),
                );
                return { id, share };
              });
              for (const discount of line.discounts) {
                const discountGroupId = generateId();
                for (const part of parts) {
                  statements.push({
                    sql: `INSERT INTO discounts (
                        discount_id, discount_group_id, record_listing_id,
                        discount_kind, discount_value, discount_eff
                      ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    bindings: [
                      generateId(),
                      discountGroupId,
                      part.id,
                      discount.kind,
                      discount.value,
                      discount.eff * part.share,
                    ],
                  });
                }
              }
              lotsByProduct.set(link.product_id, depleteLots(lots, pcs));
            }

            for (const extra of input.extras) {
              statements.push({
                sql: `INSERT INTO record_extras (
                    record_extra_id, record_extra_name, record_id,
                    record_extra_value, record_extra_eff, record_extra_kind
                  ) VALUES ($1, $2, $3, $4, $5, $6)`,
                bindings: [generateId(), extra.name, recordId, extra.value, extra.eff, extra.kind],
              });
            }
            for (const method of input.methods) {
              statements.push(insertMethod(recordId, method.methodId, method.pay));
            }

            yield* commit(statements);
            yield* bumpRevision();
            // Stock moved, so the product aggregate is stale; this runs after the
            // commit, as it does for every other record write.
            yield* refreshProducts();
          });
        },
        draft(input) {
          return Effect.gen(function* () {
            const lines = input.listings.filter((line) => line.qty > 0);
            if (lines.length === 0) {
              return yield* Effect.fail(
                new RecordError({ message: "Transaksi harus punya minimal satu barang" }),
              );
            }
            for (const line of lines) {
              // One implementation, shared with the JSON import boundary.
              const message = validateRecordLine(line);
              if (message !== null) {
                return yield* Effect.fail(new RecordError({ message }));
              }
            }
            // No path may store a record whose total is zero or negative: the
            // sale screen refuses it, and so must a direct caller.
            if (!(input.total > 0)) {
              return yield* Effect.fail(
                new RecordError({ message: "Total transaksi tidak boleh nol atau negatif" }),
              );
            }

            const isPurchase = input.mode === "outcoming";
            const allocations = isPurchase
              ? allocateCapital(
                  lines.map((line) => ({
                    qty: line.qty,
                    unit: line.unit,
                    price: line.price,
                    discounts: line.discounts,
                  })),
                  roundMoney(new Decimal(input.total).plus(input.rounding), input.fix),
                )
              : null;
            if (isPurchase && allocations === null) {
              return yield* Effect.fail(
                new RecordError({ message: "Total barang tidak boleh nol" }),
              );
            }
            if (allocations !== null) {
              for (let index = 0; index < allocations.length; index++) {
                if (allocations[index].capital.isNegative()) {
                  return yield* Effect.fail(
                    new RecordError({
                      message: `Modal ${lines[index].name || "barang"} tidak valid`,
                    }),
                  );
                }
              }
            }

            // A new listing's code collides with nothing: every code is unique
            // across live listings (case-insensitively), so two codes in one
            // cart, or one that already belongs to a catalogue listing, is
            // refused before the write rather than by the unique index.
            const manualCodes = new Map<string, string>();
            for (const line of lines) {
              if (line.listingId !== null) continue;
              const code = line.code.trim().toLowerCase();
              if (code === "") continue;
              const previous = manualCodes.get(code);
              if (previous !== undefined) {
                return yield* Effect.fail(
                  new RecordError({
                    message: `Kode ${code} dipakai lebih dari satu barang (${previous} dan ${line.name})`,
                  }),
                );
              }
              manualCodes.set(code, line.name);
            }
            if (manualCodes.size > 0) {
              const codes = [...manualCodes.keys()];
              const placeholders = codes.map((_, index) => `$${index + 1}`).join(", ");
              const taken = yield* db
                .selectMany<{ listing_code: string; listing_name: string }>(
                  `SELECT listing_code, listing_name FROM listings
                   WHERE listing_deleted_at IS NULL
                     AND lower(listing_code) IN (${placeholders})`,
                  codes,
                )
                .pipe(Effect.mapError(dbErrorToRecordError));
              if (taken.length > 0) {
                const first = taken[0];
                return yield* Effect.fail(
                  new RecordError({
                    message: `Kode ${first.listing_code} sudah dipakai oleh ${first.listing_name}`,
                  }),
                );
              }
            }

            const recordId = generateId();
            const now = Date.now();
            const statements: Statement[] = [];

            // The customer is a name/phone snapshot on the record. A new typed
            // customer is matched by name first, then created in the transaction.
            const wantedName = input.customer.name.trim();
            const wantedPhone = input.customer.phone.trim();
            let customerName = "";
            let customerPhone = "";
            if (input.customer.id !== null && input.customer.id !== "") {
              const rows = yield* db
                .selectMany<CustomerRow>(
                  `SELECT customer_name, customer_phone FROM customers
                   WHERE customer_id = $1 AND customer_deleted_at IS NULL`,
                  [input.customer.id],
                )
                .pipe(Effect.mapError(dbErrorToRecordError));
              const found = rows[0];
              // A set id wins; if the row vanished, the record carries no
              // customer rather than resurrecting half-typed text.
              customerName = found?.customer_name ?? "";
              customerPhone = found?.customer_phone ?? "";
            } else if (wantedName !== "") {
              const rows = yield* db
                .selectMany<CustomerRow>(
                  `SELECT customer_name, customer_phone FROM customers
                   WHERE customer_deleted_at IS NULL AND lower(customer_name) = lower($1)
                   ORDER BY customer_updated_at DESC LIMIT 1`,
                  [wantedName],
                )
                .pipe(Effect.mapError(dbErrorToRecordError));
              const found = rows[0];
              if (found !== undefined) {
                customerName = found.customer_name;
                customerPhone = found.customer_phone;
              } else {
                customerName = wantedName;
                customerPhone = wantedPhone;
                statements.push({
                  sql: `INSERT INTO customers (
                      customer_id, customer_name, customer_phone,
                      customer_updated_at, customer_sync_at
                    ) VALUES ($1, $2, $3, $4, NULL)`,
                  bindings: [generateId(), customerName, customerPhone, now],
                });
              }
            }

            // The supplier is the purchase counterparty, with the same
            // id-or-name behavior as the customer snapshot.
            const wantedSupplier = input.supplier.name.trim();
            let supplierId: string | null = null;
            let supplierName = "";
            if (input.supplier.id !== null && input.supplier.id !== "") {
              const rows = yield* db
                .selectMany<SupplierRow>(
                  `SELECT supplier_id, supplier_name FROM suppliers
                   WHERE supplier_id = $1 AND supplier_deleted_at IS NULL`,
                  [input.supplier.id],
                )
                .pipe(Effect.mapError(dbErrorToRecordError));
              supplierId = rows[0]?.supplier_id ?? null;
              supplierName = rows[0]?.supplier_name ?? "";
            } else if (wantedSupplier !== "") {
              const rows = yield* db
                .selectMany<SupplierRow>(
                  `SELECT supplier_id, supplier_name FROM suppliers
                   WHERE supplier_deleted_at IS NULL AND lower(supplier_name) = lower($1)
                   ORDER BY supplier_updated_at DESC LIMIT 1`,
                  [wantedSupplier],
                )
                .pipe(Effect.mapError(dbErrorToRecordError));
              const found = rows[0];
              if (found !== undefined) {
                supplierId = found.supplier_id;
                supplierName = found.supplier_name;
              } else {
                supplierId = generateId();
                supplierName = wantedSupplier;
                statements.push({
                  sql: `INSERT INTO suppliers (
                      supplier_id, supplier_name, supplier_note,
                      supplier_updated_at, supplier_sync_at, supplier_deleted_at
                    ) VALUES ($1, $2, '', $3, NULL, NULL)`,
                  bindings: [supplierId, supplierName, now],
                });
              }
            }

            statements.push(
              insertRecordStatement(
                recordId,
                {
                  createdAt: now,
                  paidAt: input.paidAt,
                  creditAt: input.creditAt,
                  rounding: input.rounding,
                  cashier: input.cashier,
                  mode: input.mode,
                  pay: input.pay,
                  note: input.note,
                  fix: input.fix,
                  customer: { name: customerName, phone: customerPhone },
                  supplier: { id: supplierId, name: supplierName },
                  subTotal: input.subTotal,
                  total: input.total,
                },
                now,
              ),
            );

            const lotsByProduct = new Map<string, StockLot[]>();
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
              const line = lines[lineIndex];
              const groupId = generateId();
              const pcs = line.qty * line.unit;
              const lineTotal = new Decimal(line.price)
                .times(line.qty)
                .minus(
                  line.discounts.reduce(
                    (total, discount) => total.plus(discount.eff),
                    new Decimal(0),
                  ),
                );
              // Choice (a) from the design: the record keeps qty in pcs and the
              // price per pc, so `price × qty` is still the line total.
              const pricePerPcs = new Decimal(line.price).div(line.unit).toNumber();

              let productId: string | null = null;
              if (line.listingId !== null) {
                const rows = yield* db
                  .selectMany<ListingLinkRow>(SELECT_LISTING_LINK, [line.listingId])
                  .pipe(Effect.mapError(dbErrorToRecordError));
                productId = rows[0]?.product_id ?? null;
              } else {
                // A hand-entered line becomes a real product and listing.
                productId = generateId();
                const listingId = generateId();
                const code = line.code.trim().toLowerCase();
                statements.push(insertProductRow(productId, line.name.trim(), now));
                statements.push(
                  insertListingRow(
                    listingId,
                    productId,
                    {
                      name: line.name.trim(),
                      price: line.price,
                      unit: line.unit,
                      kind: line.kind,
                      code: code === "" ? null : code,
                    },
                    now,
                  ),
                );
              }

              // A catalog line whose listing disappeared still belongs on the
              // record; it just moves no stock.
              if (productId === null) {
                const portionId = generateId();
                statements.push(
                  insertPortion({
                    id: portionId,
                    groupId,
                    recordId,
                    productEventId: null,
                    productId: null,
                    name: line.name,
                    kind: line.kind,
                    unit: line.unit,
                    price: pricePerPcs,
                    qty: pcs,
                    capital: 0,
                    total: lineTotal.toNumber(),
                  }),
                );
                statements.push(
                  ...insertDiscounts(
                    portionId,
                    line.discounts.filter((discount) => discount.eff !== 0),
                    1,
                  ),
                );
                continue;
              }

              let lots = lotsByProduct.get(productId);
              if (lots === undefined) lots = yield* readLots(productId);

              if (isPurchase) {
                const allocation = allocations![lineIndex];
                const received = receiveAtCapital(
                  productId,
                  lots,
                  { pcs, capital: allocation.capital.toNumber() },
                  now,
                  input.fix,
                  recordId,
                );
                statements.push(...received.statements);
                lotsByProduct.set(productId, received.lots);
                const portionId = generateId();
                statements.push(
                  insertPortion({
                    id: portionId,
                    groupId,
                    recordId,
                    productEventId: received.eventId,
                    productId,
                    name: line.name,
                    kind: line.kind,
                    unit: line.unit,
                    price: pricePerPcs,
                    qty: pcs,
                    capital: received.capital,
                    total: lineTotal.toNumber(),
                  }),
                );
                statements.push(
                  ...insertDiscounts(
                    portionId,
                    line.discounts.filter((discount) => discount.eff !== 0),
                    1,
                  ),
                );
                continue;
              }

              let portions: { eventId: string; stockId: string; take: number; capital: number }[];
              if (lots.length === 0) {
                // No lot at all: open one that already carries the oversold
                // quantity, with no capital to copy.
                const received = receivePortion(
                  productId,
                  { value: -pcs, capital: 0 },
                  now,
                  recordId,
                );
                statements.push(...received.statements);
                portions = [
                  { eventId: received.eventId, stockId: received.stockId, take: pcs, capital: 0 },
                ];
                lotsByProduct.set(productId, [{ id: received.stockId, value: -pcs, capital: 0 }]);
              } else {
                const drained = drainStatements(productId, lots, pcs, now, "", recordId);
                statements.push(...drained.statements);
                portions = drained.portions;
                lotsByProduct.set(productId, drained.lots);
              }

              const parts = portions.map((portion) => {
                const share = new Decimal(portion.take).div(pcs);
                const id = generateId();
                statements.push(
                  insertPortion({
                    id,
                    groupId,
                    recordId,
                    productEventId: portion.eventId,
                    productId,
                    name: line.name,
                    kind: line.kind,
                    unit: line.unit,
                    price: pricePerPcs,
                    qty: portion.take,
                    capital: portion.capital,
                    total: lineTotal.times(share).toNumber(),
                  }),
                );
                return { id, share: share.toNumber() };
              });

              for (const discount of line.discounts) {
                if (discount.eff === 0) continue;
                const discountGroupId = generateId();
                for (const part of parts) {
                  statements.push({
                    sql: `INSERT INTO discounts (
                        discount_id, discount_group_id, record_listing_id,
                        discount_kind, discount_value, discount_eff
                      ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    bindings: [
                      generateId(),
                      discountGroupId,
                      part.id,
                      discount.kind,
                      discount.value,
                      new Decimal(discount.eff).times(part.share).toNumber(),
                    ],
                  });
                }
              }
            }

            for (const extra of input.extras) {
              if (extra.eff === 0) continue;
              statements.push({
                sql: `INSERT INTO record_extras (
                    record_extra_id, record_extra_name, record_id,
                    record_extra_value, record_extra_eff, record_extra_kind,
                    record_extra_flag
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                bindings: [
                  generateId(),
                  extra.name,
                  recordId,
                  extra.value,
                  extra.eff,
                  extra.kind,
                  extra.flag,
                ],
              });
            }
            for (const method of input.methods) {
              // A credit keeps its chosen methods at zero so settlement can
              // reuse them; a cash record drops unused zero rows.
              if (method.pay === 0 && input.creditAt === null) continue;
              statements.push(insertMethod(recordId, method.methodId, method.pay));
            }
            for (const picture of input.images) {
              statements.push({
                sql: `INSERT INTO record_images (
                    record_image_id, record_image_order, record_image_name,
                    record_image_mime, record_id
                  ) VALUES ($1, $2, $3, $4, $5)`,
                bindings: [generateId(), picture.order, picture.name, picture.mime, recordId],
              });
            }

            // A `dual` charge books twice: the sale carries it, and the twin
            // books the same money from the paying-out side. Its statements go
            // into this same list, so neither half can be stored without the
            // other — the commit is the unit of work, not the record.
            const mirror = mirrorStatements(input.mirror, recordId, now);
            if (mirror !== null) statements.push(...mirror);

            // The cart has become a record; remove it in the same transaction.
            statements.push({
              sql: "DELETE FROM tx_records WHERE tx_record_id = $1",
              bindings: [input.draftId],
            });

            yield* commit(statements);
            yield* bumpRevision();
            // Stock moved, so the product aggregate is stale. A failure here must
            // not fail the submit: the record is already committed. Only the
            // products this record touched are re-read — the cart cannot have
            // moved anything else, and a full catalogue read here would put an
            // O(catalogue) scan between `Bayar` and its success dialog.
            yield* refreshProductsFor(lotsByProduct.keys()).pipe(
              Effect.catchAll((error) =>
                Effect.logError(`product refresh after submit failed: ${error.message}`),
              ),
            );
            return recordId;
          });
        },
      },
      count: {
        summary: (start, end) =>
          db.selectMany<SummaryRow>(SELECT_SUMMARY, [start, end]).pipe(
            Effect.mapError(dbErrorToRecordError),
            Effect.map((rows): RecordSummary[] =>
              rows.map((row) => ({ mode: row.mode, count: row.count, total: row.total })),
            ),
          ),
      },
      set: {
        paidAt(id, paidAt) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE records SET
                    record_paid_at = $1, record_updated_at = $2, record_sync_at = NULL
                  WHERE record_id = $3`,
                bindings: [paidAt, now, id],
              },
            ]);
            yield* bumpRevision();
          });
        },
        creditAt(id, creditAt) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE records SET
                    record_credit_at = $1, record_updated_at = $2, record_sync_at = NULL
                  WHERE record_id = $3`,
                bindings: [creditAt, now, id],
              },
            ]);
            yield* bumpRevision();
          });
        },
        note(id, note) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE records SET
                    record_note = $1, record_updated_at = $2, record_sync_at = NULL
                  WHERE record_id = $3`,
                bindings: [note, now, id],
              },
            ]);
            yield* bumpRevision();
          });
        },
        method(id, methodId) {
          return Effect.gen(function* () {
            // Read the record first: re-pointing the payment rows of a missing id
            // would otherwise update nothing and report success.
            yield* readRecord(id);
            yield* db
              .selectOne<{ method_id: string }>(
                "SELECT method_id FROM methods WHERE method_id = $1",
                [methodId],
              )
              .pipe(
                Effect.catchTag("DbError", (error) => Effect.fail(dbErrorToRecordError(error))),
                Effect.catchTag("NotFound", () =>
                  Effect.fail(new RecordError({ message: "Metode tidak ditemukan" })),
                ),
              );
            // Only the method the payment is filed under moves. `record_method_pay`
            // and the `record_pay` cache are left alone: correcting a mis-tapped
            // method must not restate a single rupiah of what was tendered.
            const current = yield* db
              .selectMany<MethodRow>(SELECT_METHODS_FOR("$1"), [id])
              .pipe(Effect.mapError(dbErrorToRecordError));
            if (current.every((row) => row.method_id === methodId)) return;
            const now = Date.now();
            yield* commit([
              {
                sql: "UPDATE record_methods SET method_id = $1 WHERE record_id = $2",
                bindings: [methodId, id],
              },
              {
                sql: `UPDATE records SET
                    record_updated_at = $1, record_sync_at = NULL
                  WHERE record_id = $2`,
                bindings: [now, id],
              },
            ]);
            yield* bumpRevision();
          });
        },
        toCredit(id) {
          // A credit carries no tendered money, but keep its method rows at zero:
          // that preserves the split the user chose if the credit is settled later.
          return Effect.gen(function* () {
            const now = Date.now();
            const current = yield* db
              .selectMany<MethodRow>(SELECT_METHODS_FOR("$1"), [id])
              .pipe(Effect.mapError(dbErrorToRecordError));
            yield* commit([
              { sql: "DELETE FROM record_methods WHERE record_id = $1", bindings: [id] },
              ...current.map((method) => insertMethod(id, method.method_id, 0)),
              {
                sql: `UPDATE records SET
                    record_credit_at = $1, record_paid_at = NULL,
                    record_pay = 0, record_rounding = 0,
                    record_updated_at = $1, record_sync_at = NULL
                  WHERE record_id = $2`,
                bindings: [now, id],
              },
            ]);
            yield* bumpRevision();
          });
        },
        payCredit(id, input) {
          return Effect.gen(function* () {
            if (!Number.isFinite(input.pay) || input.pay < 0 || !Number.isFinite(input.rounding)) {
              return yield* Effect.fail(
                new RecordError({ message: "Pembayaran atau pembulatan tidak valid" }),
              );
            }
            // Settling is what removes the record from the debt list, so the
            // state check has to live here and not only in the dialog: a call on
            // a cash sale used to rewrite its payment, a second call on an
            // already-settled credit re-stamped `paid_at`, and an underpayment
            // cleared the debt while leaving the shop short.
            const record = yield* readRecord(id);
            if (record.record_credit_at === null) {
              return yield* Effect.fail(
                new RecordError({ message: "Catatan ini bukan transaksi kredit" }),
              );
            }
            if (record.record_paid_at !== null) {
              return yield* Effect.fail(new RecordError({ message: "Kredit ini sudah dibayar" }));
            }
            const owed = roundToFix(
              record.record_total + record.record_rounding + input.rounding,
              record.record_fix,
            );
            if (input.pay < owed) {
              return yield* Effect.fail(
                new RecordError({
                  message: `Pembayaran tidak cukup, minimal ${owed.toLocaleString("id-ID")}`,
                }),
              );
            }
            const methods = yield* db
              .selectMany<MethodRow>(SELECT_METHODS_FOR("$1"), [id])
              .pipe(Effect.mapError(dbErrorToRecordError));
            const now = Date.now();
            // Keep every method row: a credit can be split, and settlement must
            // not collapse the many-to-one relation. Without a per-method split
            // in the debt dialog, the first method carries the whole payment and
            // the others stay at zero.
            const statements: Statement[] = methods.map((method, index) => ({
              sql: "UPDATE record_methods SET record_method_pay = $1 WHERE record_method_id = $2",
              bindings: [index === 0 ? input.pay : 0, method.record_method_id],
            }));
            statements.push({
              // The unsettled-credit condition is repeated in the write so a
              // concurrent settlement fails instead of overwriting the first.
              sql: `UPDATE records SET
                  record_pay = $1, record_rounding = $2,
                  record_paid_at = $3, record_updated_at = $3, record_sync_at = NULL
                WHERE record_id = $4
                  AND record_credit_at IS NOT NULL AND record_paid_at IS NULL`,
              bindings: [input.pay, input.rounding, now, id],
            });
            yield* commit(statements);
            yield* bumpRevision();
          });
        },
        mode(id, mode) {
          return Effect.gen(function* () {
            const record = yield* readRecord(id);
            if (record.record_mode === mode) return id;

            const newId = generateId();
            const now = Date.now();
            const statements: Statement[] = [
              {
                sql: `INSERT INTO records (
                    record_id, record_created_at, record_paid_at, record_rounding,
                    record_credit_at, record_cashier, record_mode, record_pay,
                    record_note, record_fix, record_customer_name,
                    record_customer_phone, record_sub_total, record_total,
                    record_updated_at, record_sync_at, record_deleted_at
                  )
                  SELECT
                    $1, record_created_at, record_paid_at, record_rounding,
                    record_credit_at, record_cashier, $2, record_pay,
                    record_note, record_fix, record_customer_name,
                    record_customer_phone, record_sub_total, record_total,
                    $3, NULL, NULL
                  FROM records WHERE record_id = $4`,
                bindings: [newId, mode, now, id],
              },
            ];

            // The line and payment rows move with the replacement record; the
            // old record is only a tombstone afterwards.
            statements.push(
              {
                sql: "UPDATE record_listings SET record_id = $1 WHERE record_id = $2",
                bindings: [newId, id],
              },
              {
                sql: "UPDATE record_methods SET record_id = $1 WHERE record_id = $2",
                bindings: [newId, id],
              },
              {
                sql: "UPDATE record_extras SET record_id = $1 WHERE record_id = $2",
                bindings: [newId, id],
              },
              {
                sql: "UPDATE record_images SET record_id = $1 WHERE record_id = $2",
                bindings: [newId, id],
              },
            );

            // A mode flip reverses every stock movement: the event sign flips,
            // and the cached lot takes the difference between the old and new
            // signed value.
            const events = yield* db
              .selectMany<{
                product_event_id: string;
                product_id: string;
                stock_id: string | null;
                product_event_value: number;
              }>(
                `SELECT product_event_id, product_id, stock_id, product_event_value
                 FROM product_events WHERE record_id = $1`,
                [id],
              )
              .pipe(Effect.mapError(dbErrorToRecordError));
            for (const event of events) {
              if (event.stock_id !== null) {
                statements.push({
                  sql: `UPDATE stocks SET
                      stock_value = stock_value - 2 * $1, stock_updated_at = $2
                    WHERE stock_id = $3`,
                  bindings: [event.product_event_value, now, event.stock_id],
                });
              }
              statements.push({
                sql: `UPDATE product_events SET
                    record_id = $1, product_event_value = -product_event_value
                  WHERE product_event_id = $2`,
                bindings: [newId, event.product_event_id],
              });
              statements.push(touchProduct(event.product_id, now));
            }

            statements.push({
              sql: `UPDATE records SET
                  record_deleted_at = $1, record_updated_at = $1, record_sync_at = NULL
                WHERE record_id = $2`,
              bindings: [now, id],
            });

            yield* commit(statements);
            yield* bumpRevision();
            yield* refreshProducts();
            return newId;
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const active = yield* db
              .selectMany<{
                record_mode: RecordMode;
                record_pair_id: string | null;
              }>(
                `SELECT record_mode, record_pair_id FROM records
                 WHERE record_id = $1 AND record_deleted_at IS NULL`,
                [id],
              )
              .pipe(Effect.mapError(dbErrorToRecordError));
            // Soft delete is idempotent: a second attempt must not undo the
            // compensation events written for a legacy record on the first one.
            if (active.length === 0) return;

            const now = Date.now();
            const statements: Statement[] = [
              {
                sql: `UPDATE records SET
                    record_deleted_at = $1, record_updated_at = $1, record_sync_at = NULL
                  WHERE record_id = $2`,
                bindings: [now, id],
              },
              {
                sql: "DELETE FROM product_events WHERE record_id = $1",
                bindings: [id],
              },
            ];
            const journaled = yield* db
              .selectMany<{ product_id: string }>(SELECT_JOURNALED_PRODUCTS, [id])
              .pipe(Effect.mapError(dbErrorToRecordError));

            // The twin goes with its sale. It carries no listings and no stock
            // events, so soft-deleting the row is the whole reversal — what
            // must not happen is a `dual` charge surviving as a stray expense
            // after the sale it belongs to was voided.
            const pairId = active[0].record_pair_id;
            if (pairId !== null) {
              statements.push({
                sql: `UPDATE records SET
                    record_deleted_at = $1, record_updated_at = $1, record_sync_at = NULL
                  WHERE record_id = $2 AND record_deleted_at IS NULL`,
                bindings: [now, pairId],
              });
            }
            const journaledProducts = new Set(journaled.map((row) => row.product_id));
            for (const lot of yield* touchedLots(id)) {
              statements.push(...restoreLot(lot, now));
            }

            // Before record-linked stock events existed, the inventory movement
            // was baked into `stocks` and could not be found by the replay above.
            // Reverse those legacy lines explicitly. They are deliberately
            // unlinked events: the record is being deleted, so a second delete
            // must not treat the compensation as one of its own movements. A
            // purchase cannot be removed if its units have already been consumed;
            // fail rather than write a negative stock lot.
            const moves = yield* db
              .selectMany<MoveRow>(SELECT_MOVES, [id])
              .pipe(Effect.mapError(dbErrorToRecordError));
            const legacyLotsByProduct = new Map<string, StockLot[]>();
            for (const move of moves) {
              if (journaledProducts.has(move.product_id)) continue;
              const requestedPcs = move.record_listing_qty * move.listing_unit;
              if (requestedPcs <= 0) continue;
              if (active[0].record_mode === "incoming") {
                statements.push(
                  ...receiveStatements(
                    move.product_id,
                    {
                      value: requestedPcs,
                      capital: move.record_listing_capital / move.listing_unit,
                    },
                    now,
                  ),
                );
                continue;
              }

              let lots = legacyLotsByProduct.get(move.product_id);
              if (lots === undefined) {
                lots = yield* readLots(move.product_id);
                legacyLotsByProduct.set(move.product_id, lots);
              }
              const consumed = consumeStatements(move.product_id, lots, requestedPcs, now);
              if (consumed.shortage > 0) {
                return yield* Effect.fail(
                  new RecordError({
                    message: `Stok ${move.record_listing_name} tidak mencukupi untuk menghapus catatan`,
                  }),
                );
              }
              statements.push(...consumed.statements);
              legacyLotsByProduct.set(move.product_id, depleteLots(lots, requestedPcs));
            }

            yield* commit(statements);
            yield* bumpRevision();
            // The record moved stock, so the product aggregate is stale. This
            // runs after the transaction, so a failure here means the delete
            // committed but the cached stock is behind.
            yield* refreshProducts();
          });
        },
      },
    };
  }),
);
