import { Effect, Layer, SubscriptionRef } from "effect";
import Decimal from "decimal.js";
import {
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
import {
  consumeStatements,
  depleteLots,
  drainStatements,
  receivePortion,
  receiveStatements,
  touchProduct,
  type StockLot,
} from "../product/stock-sql";
import { generateId } from "~/lib/random";

type SummaryRow = {
  mode: RecordMode;
  count: number;
  total: number;
};

type DebtRow = {
  record_id: string;
  record_paid_at: number;
  record_note: string;
  record_fix: number;
  record_total: number;
};

type RecordRow = {
  record_id: string;
  record_paid_at: number;
  record_rounding: number;
  record_is_credit: number;
  record_cashier: string;
  record_mode: RecordMode;
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

type ListingLinkRow = {
  listing_id: string;
  product_id: string;
  listing_unit: number;
};

/** The fields `insertRecordStatement` needs; `RecordImport` is a superset. */
type RecordHeader = {
  paidAt: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: RecordMode;
  pay: number;
  note: string;
  fix: number;
  customer: { name: string; phone: string };
  subTotal: number;
  total: number;
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
        listing_kind, listing_code, listing_code_kind, listing_updated_at, listing_sync_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)`,
    bindings: [
      listingId,
      productId,
      input.name,
      input.price,
      input.unit,
      input.kind,
      input.code,
      input.code === null ? null : "barcode",
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
const SELECT_SUMMARY = `
  SELECT
    record_mode AS mode,
    COUNT(*) AS count,
    SUM(ROUND(record_total + record_rounding, record_fix)) AS total
  FROM records
  WHERE record_deleted_at IS NULL
    AND record_paid_at >= $1 AND record_paid_at < $2
  GROUP BY record_mode`;

const RECORD_COLUMNS = `
  record_id, record_paid_at, record_rounding, record_is_credit, record_cashier,
  record_mode, record_pay, record_note, record_fix, record_customer_name,
  record_customer_phone, record_sub_total, record_total, record_updated_at,
  record_sync_at, record_deleted_at`;

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
    record_extra_kind
  FROM record_extras
  WHERE record_id = $1`;

const SELECT_METHODS_FOR = (placeholders: string) => `
  SELECT
    rm.record_method_id, rm.record_id, rm.method_id, rm.record_method_pay,
    m.method_name, m.method_kind
  FROM record_methods rm
  JOIN methods m ON m.method_id = rm.method_id
  WHERE rm.record_id IN (${placeholders})`;

// `COUNT(*) OVER ()` counts the whole match set before LIMIT trims the page, so a
// single query answers both "here are the first N" and "there are M of them".
// Without it the page would have to re-ask for the count on every fetch.
const SELECT_LISTING_HISTORY = `
  SELECT
    r.record_id, r.record_paid_at, r.record_mode,
    rl.record_listing_id, rl.record_listing_name, rl.record_listing_price,
    rl.record_listing_qty,
    COUNT(*) OVER () AS total_count
  FROM record_listings rl
  JOIN records r ON r.record_id = rl.record_id
  WHERE r.record_deleted_at IS NULL
    AND r.record_paid_at >= $1 AND r.record_paid_at < $2
    AND r.record_mode = $3
    AND rl.record_listing_name LIKE $4 ESCAPE '\\'
  ORDER BY r.record_paid_at DESC
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
    paidAt: row.record_paid_at,
    rounding: row.record_rounding,
    isCredit: row.record_is_credit === 1,
    cashier: row.record_cashier,
    mode: row.record_mode,
    pay: row.record_pay,
    note: row.record_note,
    fix: row.record_fix,
    customer: { name: row.record_customer_name, phone: row.record_customer_phone },
    subTotal: roundToFix(row.record_sub_total, row.record_fix),
    total: roundToFix(row.record_total, row.record_fix),
    grandTotal,
    change: roundToFix(row.record_pay - grandTotal, row.record_fix),
    methods,
    updatedAt: row.record_updated_at,
    syncAt: row.record_sync_at,
    deletedAt: row.record_deleted_at,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function insertMethod(recordId: string, methodId: string, pay: number): Statement {
  return {
    sql: `INSERT INTO record_methods (
        record_method_id, record_id, method_id, record_method_pay
      ) VALUES ($1, $2, $3, $4)`,
    bindings: [generateId(), recordId, methodId, pay],
  };
}

// The lines a mode flip has to move: only those pointing at a catalog listing
// have stock behind them. `listing_unit` converts the line's qty into base pcs,
// which is the unit `stocks` counts in.
const SELECT_MOVES = `
  SELECT rl.record_listing_name, rl.record_listing_qty, rl.record_listing_capital,
         rl.product_id, rl.record_listing_unit AS listing_unit
  FROM record_listings rl
  WHERE rl.record_id = $1 AND rl.product_id IS NOT NULL`;

// A credit record is outstanding until `payCredit` clears its flag, so this is
// the debt list. Legacy phrasing kept `record_total`, which is what is owed.
const SELECT_DEBT = `
  SELECT record_id, record_paid_at, record_note, record_fix, record_total
  FROM records
  WHERE record_is_credit = 1 AND record_deleted_at IS NULL
  ORDER BY record_paid_at DESC`;

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
// baked into the aggregate instead — see `set.mode`.
const SELECT_JOURNALED_PRODUCTS = `
  SELECT DISTINCT product_id FROM product_events WHERE record_id = $1`;

// A catalog listing an imported line can still point at, with the product and
// the unit that turn its qty into pcs. A deleted listing links to nothing.
const SELECT_LISTING_LINK = `
  SELECT listing_id, product_id, listing_unit
  FROM listings
  WHERE listing_id = $1 AND listing_deleted_at IS NULL`;

function insertRecordStatement(id: string, input: RecordHeader, now: number): Statement {
  return {
    sql: `INSERT INTO records (
        record_id, record_paid_at, record_rounding, record_is_credit, record_cashier,
        record_mode, record_pay, record_note, record_fix, record_customer_name,
        record_customer_phone, record_sub_total, record_total, record_updated_at,
        record_sync_at, record_deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NULL, NULL)`,
    bindings: [
      id,
      input.paidAt,
      input.rounding,
      input.isCredit ? 1 : 0,
      input.cashier,
      input.mode,
      input.pay,
      input.note,
      input.fix,
      input.customer.name,
      input.customer.phone,
      input.subTotal,
      input.total,
      now,
    ],
  };
}

/** A `record_listings` portion row. */
function insertPortion(p: {
  id: string;
  groupId: string;
  recordId: string;
  productEventId: string | null;
  productId: string | null;
  name: string;
  kind: string;
  unit: number;
  price: number;
  qty: number;
  capital: number;
  total: number;
}): Statement {
  return {
    sql: `INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    bindings: [
      p.id,
      p.groupId,
      p.recordId,
      p.productEventId,
      p.productId,
      p.name,
      p.kind,
      p.unit,
      p.price,
      p.qty,
      p.capital,
      p.total,
    ],
  };
}

/** One copy of each discount for a line that is a single portion. */
function insertDiscounts(
  portionId: string,
  discounts: { kind: DiscountKind; value: number; eff: number }[],
  share: number,
): Statement[] {
  return discounts.map((discount) => ({
    sql: `INSERT INTO discounts (
        discount_id, discount_group_id, record_listing_id, discount_kind,
        discount_value, discount_eff
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
    bindings: [
      generateId(),
      generateId(),
      portionId,
      discount.kind,
      discount.value,
      discount.eff * share,
    ],
  }));
}

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
      return db
        .selectMany<MethodRow>(SELECT_METHODS_FOR(placeholders), [...recordIds])
        .pipe(
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
              paidAt: row.record_paid_at,
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
        let sql = `
          SELECT ${RECORD_COLUMNS} FROM records
          WHERE record_deleted_at IS NULL
            AND record_paid_at >= $1 AND record_paid_at < $2`;
        if (trimmed !== "") {
          bindings.push(`%${escapeLike(trimmed)}%`);
          sql += `
            AND EXISTS (
              SELECT 1 FROM record_listings rl
              WHERE rl.record_id = records.record_id
                AND rl.record_listing_name LIKE $3 ESCAPE '\\'
            )`;
        }
        sql += " ORDER BY record_paid_at ASC";

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
          .pipe(
            Effect.catchTag("DbError", (error) => Effect.fail(dbErrorToRecordError(error))),
          );
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
            .selectMany<{ value: number; capital: number }>(SELECT_SURVIVING_EVENTS, [
              lot.stock_id,
              recordId,
            ])
            .pipe(Effect.mapError(dbErrorToRecordError));
          let value = 0;
          for (const event of surviving) value += event.value;
          const last = surviving[surviving.length - 1];
          lots.push({
            stockId: lot.stock_id,
            productId: lot.product_id,
            restored:
              last === undefined || last === null
                ? null
                : { value, capital: last.capital },
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
      return { id: lot.stockId, value: lot.current.value - lot.delta, capital: lot.current.capital };
    }

    /** Statements putting one lot back where its surviving events leave it. */
    function restoreLot(lot: TouchedLot, now: number): Statement[] {
      const touched = touchProduct(lot.productId, now);
      const restored = restoredLot(lot);
      if (restored === null) {
        // Nothing survives and the record put stock *in*: this lot was the
        // record's own doing, so drop it rather than leave an empty husk.
        return [{ sql: "DELETE FROM stocks WHERE stock_id = $1", bindings: [lot.stockId] }, touched];
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

    /** The method a record was paid by, if it has one on file. */
    function currentMethodId(id: string): Effect.Effect<string | null, RecordError> {
      return db.selectMany<MethodRow>(SELECT_METHODS_FOR("$1"), [id]).pipe(
        Effect.mapError(dbErrorToRecordError),
        Effect.map((rows) => rows[0]?.method_id ?? null),
      );
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
        external(input) {
          return Effect.gen(function* () {
            const recordId = generateId();
            const now = Date.now();
            const statements: Statement[] = [insertRecordStatement(recordId, input, now)];
            // Lots are read once per product and depleted as lines take from them,
            // since the transaction has not run and a second read would hand out
            // stock an earlier line already took.
            const lotsByProduct = new Map<string, StockLot[]>();

            for (const line of input.listings) {
              // The entered line; its portions share this group id.
              const groupId = generateId();
              const link = line.listingId === null
                ? null
                : ((yield* db
                    .selectMany<{ listing_id: string; product_id: string; listing_unit: number }>(
                      SELECT_LISTING_LINK,
                      [line.listingId],
                    )
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
                  { value: line.qty * link.listing_unit, capital: line.capital / link.listing_unit },
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
              const { statements: consumed, shortage, portions } = consumeStatements(
                link.product_id,
                lots,
                pcs,
                now,
                "",
                recordId,
              );
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
            if (input.mode !== "incoming") {
              return yield* Effect.fail(
                new RecordError({ message: "Mode pembelian belum didukung" }),
              );
            }
            const lines = input.listings.filter((line) => line.qty > 0);
            if (lines.length === 0) {
              return yield* Effect.fail(
                new RecordError({ message: "Transaksi harus punya minimal satu barang" }),
              );
            }
            for (const line of lines) {
              if (!Number.isFinite(line.qty) || line.qty <= 0) {
                return yield* Effect.fail(
                  new RecordError({ message: "Jumlah barang tidak valid" }),
                );
              }
              if (!Number.isInteger(line.unit) || line.unit < 1) {
                return yield* Effect.fail(
                  new RecordError({ message: `Satuan ${line.name || "barang"} tidak valid` }),
                );
              }
              if (line.listingId === null && line.name.trim() === "") {
                return yield* Effect.fail(
                  new RecordError({ message: "Nama barang manual harus diisi" }),
                );
              }
            }

            // A new listing's code is a barcode; two of them in one cart, or one
            // that collides with an existing barcode, is refused. A collision
            // with a QR listing is allowed — the cashier saw the warning.
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
                     AND listing_code_kind = 'barcode'
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

            statements.push(
              insertRecordStatement(
                recordId,
                {
                  paidAt: input.paidAt,
                  rounding: input.rounding,
                  isCredit: false,
                  cashier: input.cashier,
                  mode: input.mode,
                  pay: input.pay,
                  note: input.note,
                  fix: input.fix,
                  customer: { name: customerName, phone: customerPhone },
                  subTotal: input.subTotal,
                  total: input.total,
                },
                now,
              ),
            );

            const lotsByProduct = new Map<string, StockLot[]>();
            for (const line of lines) {
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
                lotsByProduct.set(productId, [
                  { id: received.stockId, value: -pcs, capital: 0 },
                ]);
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
                    record_extra_value, record_extra_eff, record_extra_kind
                  ) VALUES ($1, $2, $3, $4, $5, $6)`,
                bindings: [generateId(), extra.name, recordId, extra.value, extra.eff, extra.kind],
              });
            }
            for (const method of input.methods) {
              if (method.pay === 0) continue;
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

            // The cart has become a record; remove it in the same transaction.
            statements.push({
              sql: "DELETE FROM tx_records WHERE tx_record_id = $1",
              bindings: [input.draftId],
            });

            yield* commit(statements);
            yield* bumpRevision();
            // Stock moved, so the product aggregate is stale. A failure here must
            // not fail the submit: the record is already committed.
            yield* refreshProducts().pipe(
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
        methods(id, rows) {
          return Effect.gen(function* () {
            if (rows.length === 0) {
              return yield* Effect.fail(
                new RecordError({ message: "Metode pembayaran harus diisi" }),
              );
            }
            if (rows.some((row) => !Number.isFinite(row.pay) || row.pay < 0)) {
              return yield* Effect.fail(
                new RecordError({ message: "Jumlah pembayaran tidak valid" }),
              );
            }
            const now = Date.now();
            // `record_pay` is a denormalized cache of this sum, so the two move
            // together — that is the whole reason this is one write.
            const pay = rows.reduce((total, row) => total + row.pay, 0);
            yield* commit([
              { sql: "DELETE FROM record_methods WHERE record_id = $1", bindings: [id] },
              ...rows.map((row) => insertMethod(id, row.methodId, row.pay)),
              {
                sql: `UPDATE records SET
                    record_pay = $1, record_updated_at = $2, record_sync_at = NULL
                  WHERE record_id = $3`,
                bindings: [pay, now, id],
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
                    record_is_credit = 1, record_pay = 0, record_rounding = 0,
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
            const methodId = yield* currentMethodId(id);
            if (methodId === null) {
              // Unreachable from the app (every record is committed with a
              // method), and better than writing a record whose cached pay no
              // longer matches its payments.
              return yield* Effect.fail(
                new RecordError({ message: "Catatan ini belum punya metode pembayaran" }),
              );
            }
            const now = Date.now();
            yield* commit([
              { sql: "DELETE FROM record_methods WHERE record_id = $1", bindings: [id] },
              insertMethod(id, methodId, input.pay),
              {
                sql: `UPDATE records SET
                    record_is_credit = 0, record_pay = $1, record_rounding = $2,
                    record_paid_at = $3, record_updated_at = $3, record_sync_at = NULL
                  WHERE record_id = $4`,
                bindings: [input.pay, input.rounding, now, id],
              },
            ]);
            yield* bumpRevision();
          });
        },
        linkStock(recordListingId, stockId) {
          return Effect.gen(function* () {
            const portions = yield* db
              .selectMany<{
                record_id: string;
                product_event_id: string | null;
              }>(
                `SELECT record_id, product_event_id
                 FROM record_listings WHERE record_listing_id = $1`,
                [recordListingId],
              )
              .pipe(Effect.mapError(dbErrorToRecordError));
            const portion = portions[0];
            if (portion === undefined) return;
            if (portion.product_event_id === null) {
              return yield* Effect.fail(
                new RecordError({ message: "Baris ini tidak punya pergerakan stok" }),
              );
            }

            const events = yield* db
              .selectMany<{
                stock_id: string | null;
                product_id: string;
                product_event_value: number;
              }>(
                `SELECT stock_id, product_id, product_event_value
                 FROM product_events WHERE product_event_id = $1`,
                [portion.product_event_id],
              )
              .pipe(Effect.mapError(dbErrorToRecordError));
            const event = events[0];
            if (event === undefined) return;
            if (event.product_event_value >= 0) {
              return yield* Effect.fail(
                new RecordError({ message: "Hanya baris penjualan yang bisa dipindah lotnya" }),
              );
            }
            if (event.stock_id === stockId) return;

            const pcs = -event.product_event_value;
            const now = Date.now();

            // Unlink: the event stays in the journal but no longer consumes from
            // a lot, so the pcs go back to the lot they used to come from.
            if (stockId === null) {
              if (event.stock_id === null) return;
              yield* commit([
                {
                  sql: "UPDATE stocks SET stock_value = stock_value + $1, stock_updated_at = $2 WHERE stock_id = $3",
                  bindings: [pcs, now, event.stock_id],
                },
                {
                  sql: "UPDATE product_events SET stock_id = NULL WHERE product_event_id = $1",
                  bindings: [portion.product_event_id],
                },
                touchProduct(event.product_id, now),
                {
                  sql: `UPDATE records SET record_updated_at = $1, record_sync_at = NULL
                    WHERE record_id = $2`,
                  bindings: [now, portion.record_id],
                },
              ]);
              yield* bumpRevision();
              yield* refreshProducts();
              return;
            }

            const lots = yield* db
              .selectMany<{
                stock_id: string;
                product_id: string;
                stock_capital: number;
              }>(
                `SELECT stock_id, product_id, stock_capital
                 FROM stocks WHERE stock_id IN ($1, $2)`,
                [event.stock_id, stockId],
              )
              .pipe(Effect.mapError(dbErrorToRecordError));
            const target = lots.find((lot) => lot.stock_id === stockId);
            if (target === undefined) {
              return yield* Effect.fail(new RecordError({ message: "Stok tujuan tidak ditemukan" }));
            }

            const statements: Statement[] = [];
            // A previously dangling event has no lot to give the pcs back to.
            if (event.stock_id !== null) {
              statements.push({
                sql: "UPDATE stocks SET stock_value = stock_value + $1, stock_updated_at = $2 WHERE stock_id = $3",
                bindings: [pcs, now, event.stock_id],
              });
            }
            statements.push(
              {
                sql: "UPDATE stocks SET stock_value = stock_value - $1, stock_updated_at = $2 WHERE stock_id = $3",
                bindings: [pcs, now, target.stock_id],
              },
              {
                sql: `UPDATE product_events SET
                    stock_id = $1, product_id = $2, product_event_capital = $3
                  WHERE product_event_id = $4`,
                bindings: [
                  target.stock_id,
                  target.product_id,
                  target.stock_capital,
                  portion.product_event_id,
                ],
              },
              {
                // Only the attribution moves: the line keeps the modal it was
                // recorded with, so the receipt's cost basis stays historical.
                sql: `UPDATE record_listings SET product_id = $1
                  WHERE record_listing_id = $2`,
                bindings: [target.product_id, recordListingId],
              },
              touchProduct(event.product_id, now),
              touchProduct(target.product_id, now),
              {
                sql: `UPDATE records SET record_updated_at = $1, record_sync_at = NULL
                  WHERE record_id = $2`,
                bindings: [now, portion.record_id],
              },
            );
            yield* commit(statements);
            yield* bumpRevision();
            yield* refreshProducts();
          });
        },
        mode(id, mode) {
          return Effect.gen(function* () {
            const record = yield* readRecord(id);
            if (record.record_mode === mode) return;

            const now = Date.now();
            const statements: Statement[] = [];

            /**
             * The statements that move one line's pcs one way. A purchase arrives
             * as its own cost lot at the capital it was bought for; a sale consumes
             * FIFO, like any other sale, and fails when the product cannot cover it.
             */
            const lotsByProduct = new Map<string, StockLot[]>();

            function moveLine(
              move: MoveRow,
              direction: RecordMode,
              passes: number,
              eventRecordId: string | null,
            ): Effect.Effect<Statement[], RecordError> {
              return Effect.gen(function* () {
                const requestedPcs = move.record_listing_qty * move.listing_unit * passes;
                if (requestedPcs === 0) return [];
                if (direction === "outcoming") {
                  // Listing capital is per listing unit, while a stock lot's
                  // capital is per base piece.
                  return receiveStatements(
                    move.product_id,
                    {
                      value: requestedPcs,
                      capital: move.record_listing_capital / move.listing_unit,
                    },
                    now,
                    eventRecordId,
                  );
                }
                // Lots are read once per product and depleted here as the lines
                // take from them: the transaction has not run yet, so a second
                // read would hand out stock the first line already took. Twenty
                // records on file carry two lines against the same product.
                let lots = lotsByProduct.get(move.product_id);
                if (lots === undefined) {
                  lots = yield* readLots(move.product_id);
                  lotsByProduct.set(move.product_id, lots);
                }
                const pcs = requestedPcs;
                const { statements: consumed, shortage } = consumeStatements(
                  move.product_id,
                  lots,
                  pcs,
                  now,
                  "",
                  eventRecordId,
                );
                if (shortage > 0) {
                  return yield* Effect.fail(
                    new RecordError({
                      message: `Stok ${move.record_listing_name} tidak mencukupi`,
                    }),
                  );
                }
                lotsByProduct.set(move.product_id, depleteLots(lots, pcs));
                return consumed;
              });
            }

            // 1. Take back whatever this record did to stock, so the flip starts
            //    from a state that never saw it. For a record written by the
            //    event-linked commit path that is exact: its events are struck
            //    from the journal and the lots they touched are rebuilt from the
            //    events that survive them.
            const journaled = yield* db
              .selectMany<{ product_id: string }>(SELECT_JOURNALED_PRODUCTS, [id])
              .pipe(Effect.mapError(dbErrorToRecordError));
            const journaledProducts = new Set(journaled.map((row) => row.product_id));
            statements.push({
              sql: "DELETE FROM product_events WHERE record_id = $1",
              bindings: [id],
            });
            const touched = yield* touchedLots(id);
            for (const lot of touched) {
              statements.push(...restoreLot(lot, now));
            }
            // `readLots` below still sees the pre-transaction state. If the new
            // direction consumes from a lot this same transaction restores or
            // deletes, prime the in-memory FIFO view with that restored state.
            if (mode === "incoming") {
              for (const lot of touched) {
                let lots = lotsByProduct.get(lot.productId);
                if (lots === undefined) {
                  lots = yield* readLots(lot.productId);
                  lotsByProduct.set(lot.productId, lots);
                }
                const index = lots.findIndex((item) => item.id === lot.stockId);
                const restored = restoredLot(lot);
                if (index >= 0) {
                  if (restored === null) lots.splice(index, 1);
                  else lots[index] = restored;
                } else if (restored !== null) {
                  // A surviving journal event normally keeps its stock row in
                  // `readLots`; append only for a repaired dangling-lot case.
                  lots.push(restored);
                }
              }
            }

            // 2. Apply the new direction, line by line. A line whose product the
            //    journal never recorded carries its movement baked into the
            //    product's aggregate, so step 1 could not take it back. Two passes
            //    fix that without a second movement: one to undo what the line did
            //    as the old mode, one to do what it does as the new one — the
            //    legacy `stock ± 2 × qty`, in lot form.
            const moves = yield* db
              .selectMany<MoveRow>(SELECT_MOVES, [id])
              .pipe(Effect.mapError(dbErrorToRecordError));
            for (const move of moves) {
              const journaled = journaledProducts.has(move.product_id);
              const passes = journaled ? 1 : 2;
              // Keep legacy movements unlinked. Delete will then compensate for
              // the old baked-in direction instead of treating the whole flip as
              // a new journaled record movement and losing that old baseline.
              statements.push(...(yield* moveLine(move, mode, passes, journaled ? id : null)));
            }

            statements.push({
              sql: `UPDATE records SET
                  record_mode = $1, record_updated_at = $2, record_sync_at = NULL
                WHERE record_id = $3`,
              bindings: [mode, now, id],
            });

            yield* commit(statements);
            yield* bumpRevision();
            yield* refreshProducts();
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const active = yield* db
              .selectMany<{ record_mode: RecordMode }>(
                "SELECT record_mode FROM records WHERE record_id = $1 AND record_deleted_at IS NULL",
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
