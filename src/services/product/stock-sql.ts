import { generateId } from "~/lib/random";
import type { Statement } from "../db";

export type StockLot = { id: string; value: number; capital: number };

/** One lot's share of a FIFO consumption. */
type Take = { lot: StockLot; take: number };

/** One lot's share of a drain; `take` is positive even when the lot goes negative. */
export type DrainPortion = { eventId: string; stockId: string; take: number; capital: number };

/** A portion of a movement, keyed to the journal row it wrote. */
export type StockPortion = {
  /** The `product_events` row this portion caused. */
  eventId: string;
  stockId: string;
  /** How many pcs moved (always positive here). */
  pcs: number;
  /** The lot's capital per pc. */
  capital: number;
};

/** Bump the aggregate timestamp and clear its sync flag. */
export function touchProduct(productId: string, now: number): Statement {
  return {
    sql: "UPDATE products SET product_updated_at = $1, product_sync_at = NULL WHERE product_id = $2",
    bindings: [now, productId],
  };
}

function insertEvent(
  eventId: string,
  productId: string,
  stockId: string,
  delta: number,
  capital: number,
  now: number,
  note = "",
  /** The record that caused the movement, when a record did — see `record/live.ts`. */
  recordId: string | null = null,
): Statement {
  return {
    sql: `INSERT INTO product_events (
        product_event_id, product_event_created_at, product_event_sync_at,
        product_event_value, product_event_capital, product_id, stock_id, record_id,
        product_event_note
      ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)`,
    bindings: [eventId, now, delta, capital, productId, stockId, recordId, note],
  };
}

/**
 * A new cost lot plus its positive opening event, with the ids it minted so a
 * caller can point a `record_listings` portion at the exact event.
 */
export function receivePortion(
  productId: string,
  input: { value: number; capital: number },
  now: number,
  recordId: string | null = null,
) {
  const stockId = generateId();
  const eventId = generateId();
  const statements: Statement[] = [
    {
      sql: `INSERT INTO stocks (
          stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
      bindings: [stockId, productId, input.value, input.capital, now, now],
    },
    insertEvent(eventId, productId, stockId, input.value, input.capital, now, "", recordId),
    touchProduct(productId, now),
  ];
  return { statements, eventId, stockId };
}

/** A new cost lot plus its positive opening event. */
export function receiveStatements(
  productId: string,
  input: { value: number; capital: number },
  now: number,
  recordId: string | null = null,
): Statement[] {
  return receivePortion(productId, input, now, recordId).statements;
}

/**
 * Drain `pcs` across lots from oldest to newest. Every lot but the last is
 * clamped at zero; the last lot takes whatever remains and may go negative.
 * Unlike `consumeStatements`, a shortage is not an error — the last lot absorbs
 * it, which is the house rule for a sale.
 *
 * The returned `lots` are the lots as they stand after the drain, so a second
 * line for the same product sees what the first one left.
 */
export function drainStatements(
  productId: string,
  lots: readonly StockLot[],
  pcs: number,
  now: number,
  note = "",
  recordId: string | null = null,
): { statements: Statement[]; portions: DrainPortion[]; lots: StockLot[]; shortage: number } {
  const statements: Statement[] = [];
  const portions: DrainPortion[] = [];
  const nextLots = [...lots];
  let remaining = pcs;

  for (let index = 0; index < lots.length && remaining > 0; index++) {
    const lot = lots[index];
    const isLast = index === lots.length - 1;
    // Every lot but the last is clamped at zero. The last one absorbs the rest,
    // even when that makes its value negative.
    const take = isLast ? remaining : Math.min(Math.max(lot.value, 0), remaining);
    if (take <= 0) continue;

    statements.push({
      sql: "UPDATE stocks SET stock_value = stock_value - $1, stock_updated_at = $2 WHERE stock_id = $3",
      bindings: [take, now, lot.id],
    });
    const eventId = generateId();
    statements.push(insertEvent(eventId, productId, lot.id, -take, lot.capital, now, note, recordId));
    portions.push({ eventId, stockId: lot.id, take, capital: lot.capital });
    nextLots[index] = { ...lot, value: lot.value - take };
    remaining -= take;
  }

  if (statements.length > 0) statements.push(touchProduct(productId, now));
  return { statements, portions, lots: nextLots, shortage: remaining };
}

/**
 * FIFO allocation across lots (oldest first), without touching the database.
 * Exposed because callers that consume more than once before writing — a record's
 * lines are one transaction, so a second line must not be offered stock the first
 * one already took — need to keep the check and the movement in the same step.
 */
export function allocateFifo(
  lots: readonly StockLot[],
  pcs: number,
): { takes: Take[]; shortage: number } {
  const takes: Take[] = [];
  let remaining = pcs;

  for (const lot of lots) {
    if (remaining <= 0) break;
    if (lot.value <= 0) continue;

    const take = Math.min(lot.value, remaining);
    takes.push({ lot, take });
    remaining -= take;
  }

  return { takes, shortage: remaining };
}

/** The same lots, as they stand once `pcs` have been taken out of them. */
export function depleteLots(lots: readonly StockLot[], pcs: number): StockLot[] {
  const taken = new Map(allocateFifo(lots, pcs).takes.map(({ lot, take }) => [lot.id, take]));
  return lots.map((lot) => ({ ...lot, value: lot.value - (taken.get(lot.id) ?? 0) }));
}

/**
 * FIFO consumption across lots (oldest first). Returns the statements plus any
 * remaining shortage; the caller must fail when `shortage > 0`. Each take is
 * also reported with its event id so a record line can be split into portions.
 */
export function consumeStatements(
  productId: string,
  lots: readonly StockLot[],
  pcs: number,
  now: number,
  note = "",
  recordId: string | null = null,
): { statements: Statement[]; shortage: number; portions: StockPortion[] } {
  const statements: Statement[] = [];
  const portions: StockPortion[] = [];
  const { takes, shortage } = allocateFifo(lots, pcs);

  for (const { lot, take } of takes) {
    const eventId = generateId();
    statements.push({
      sql: "UPDATE stocks SET stock_value = stock_value - $1, stock_updated_at = $2 WHERE stock_id = $3",
      bindings: [take, now, lot.id],
    });
    statements.push(insertEvent(eventId, productId, lot.id, -take, lot.capital, now, note, recordId));
    portions.push({ eventId, stockId: lot.id, pcs: take, capital: lot.capital });
  }

  if (statements.length > 0) statements.push(touchProduct(productId, now));
  return { statements, shortage, portions };
}

/** Manual correction of a lot; a capital-only change is a delta-0 event. */
export function adjustStatements(
  productId: string,
  lot: StockLot,
  next: { value: number; capital: number },
  now: number,
  note = "",
): Statement[] {
  return [
    {
      sql: "UPDATE stocks SET stock_value = $1, stock_capital = $2, stock_updated_at = $3 WHERE stock_id = $4",
      bindings: [next.value, next.capital, now, lot.id],
    },
    insertEvent(generateId(), productId, lot.id, next.value - lot.value, next.capital, now, note),
    touchProduct(productId, now),
  ];
}
