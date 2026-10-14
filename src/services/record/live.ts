import { Effect, Layer, SubscriptionRef } from "effect";
import {
  RecordError,
  RecordService,
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
import { touchProduct } from "../product/stock-sql";

type SummaryRow = {
  mode: RecordMode;
  count: number;
  total: number;
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
  listing_id: string | null;
  record_listing_name: string;
  record_listing_kind: string;
  record_listing_price: number;
  record_listing_qty: number;
  record_listing_capital: number;
  record_listing_total: number;
};

type DiscountRow = {
  discount_id: string;
  record_listing_id: string;
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
// insertion order, which is what a receipt wants. Same for the other children.
const SELECT_LISTINGS = `
  SELECT
    record_listing_id, listing_id, record_listing_name, record_listing_kind,
    record_listing_price, record_listing_qty, record_listing_capital,
    record_listing_total
  FROM record_listings
  WHERE record_id = $1`;

const SELECT_DISCOUNTS = `
  SELECT d.discount_id, d.record_listing_id, d.discount_kind, d.discount_value, d.discount_eff
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
  // `change` and `subTotal` round like the legacy JS did: from the unrounded
  // gross, not from an already-rounded grand total.
  const grossTotal = row.record_total + row.record_rounding;
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
    grandTotal: roundToFix(grossTotal, row.record_fix),
    change: roundToFix(row.record_pay - grossTotal, row.record_fix),
    methods,
    updatedAt: row.record_updated_at,
    syncAt: row.record_sync_at,
    deletedAt: row.record_deleted_at,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
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
        const discountsByListing = new Map<string, Discount[]>();
        for (const discount of discountRows) {
          const list: Discount[] = discountsByListing.get(discount.record_listing_id) ?? [];
          list.push({
            id: discount.discount_id,
            kind: discount.discount_kind,
            value: discount.discount_value,
            eff: discount.discount_eff,
          });
          discountsByListing.set(discount.record_listing_id, list);
        }

        const listings: RecordListing[] = listingRows.map((listing) => ({
          id: listing.record_listing_id,
          listingId: listing.listing_id,
          name: listing.record_listing_name,
          kind: listing.record_listing_kind,
          price: listing.record_listing_price,
          qty: listing.record_listing_qty,
          capital: listing.record_listing_capital,
          total: listing.record_listing_total,
          discounts: discountsByListing.get(listing.record_listing_id) ?? [],
        }));

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

    return {
      get: {
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
      count: {
        summary: (start, end) =>
          db.selectMany<SummaryRow>(SELECT_SUMMARY, [start, end]).pipe(
            Effect.mapError(dbErrorToRecordError),
            Effect.map((rows): RecordSummary[] =>
              rows.map((row) => ({ mode: row.mode, count: row.count, total: row.total })),
            ),
          ),
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const now = Date.now();

            // Which lots did this record move, and what survives once its events
            // are gone? Read everything first — the write is one transaction.
            const touched = yield* db
              .selectMany<{ stock_id: string; product_id: string }>(
                "SELECT DISTINCT stock_id, product_id FROM product_events WHERE record_id = $1",
                [id],
              )
              .pipe(Effect.mapError(dbErrorToRecordError));

            const lots: {
              stockId: string;
              productId: string;
              value: number;
              capital: number | null;
            }[] = [];
            for (const lot of touched) {
              // `stocks` is a local cache of the event journal, so replay the
              // events that survive: summed value, capital as of the last one.
              const surviving = yield* db
                .selectMany<{ value: number; capital: number }>(
                  `SELECT product_event_value AS value, product_event_capital AS capital
                   FROM product_events
                   WHERE stock_id = $1 AND (record_id IS NULL OR record_id <> $2)
                   ORDER BY product_event_created_at ASC, product_event_id ASC`,
                  [lot.stock_id, id],
                )
                .pipe(Effect.mapError(dbErrorToRecordError));
              let value = 0;
              for (const event of surviving) value += event.value;
              const last = surviving[surviving.length - 1];
              lots.push({
                stockId: lot.stock_id,
                productId: lot.product_id,
                value,
                capital: last === undefined ? null : last.capital,
              });
            }

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

            for (const lot of lots) {
              if (lot.capital === null) {
                // This record was the lot's only reason to exist (a received
                // lot with no other events): drop it rather than leave an empty
                // husk behind.
                statements.push({
                  sql: "DELETE FROM stocks WHERE stock_id = $1",
                  bindings: [lot.stockId],
                });
              } else {
                statements.push({
                  sql: `UPDATE stocks SET
                      stock_value = $1, stock_capital = $2, stock_updated_at = $3
                    WHERE stock_id = $4`,
                  bindings: [lot.value, lot.capital, now, lot.stockId],
                });
              }
              statements.push(touchProduct(lot.productId, now));
            }

            yield* db.transaction(statements).pipe(Effect.mapError(dbErrorToRecordError));
            yield* SubscriptionRef.update(revisionRef, (current) => current + 1);
            // The record moved stock, so the product aggregate is stale. This
            // runs after the transaction, so a failure here means the delete
            // committed but the cached stock is behind.
            yield* product
              .refresh()
              .pipe(Effect.mapError((error) => new RecordError({ message: error.message })));
          });
        },
      },
    };
  }),
);
