import { generateId } from "~/lib/random";
import type { Statement } from "../db";
import { sameCapital } from "../record/capital";

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


/**
 * Close a product's oversold lots with the stock that has just arrived, before
 * the purchase lands on them.
 *
 * A lot goes negative when its goods are sold before they are booked, so it is a
 * hole in the inventory, not a lot to add to. Adding the purchase to it anyway —
 * or, when the capitals differ, leaving the hole beside the fresh lot — keeps the
 * hole's value in the average and reports a cost per pc nobody paid: a -1 lot at
 * 10.000 with 6 pcs at 12.000 arriving reads as 22.000 for the one pc that is
 * left, and the same case with 12 pcs arriving reads as 12.181,82. Filling the
 * hole first leaves the leftover stock valued at the price actually paid; the
 * difference is the correction the earlier sale owes, which no write can put on
 * an immutable record, so it is better spent here than smeared over every future
 * sale of the product.
 *
 * A lot still negative after the fill (`pcs` did not cover the hole) adopts
 * `capital`: goods bought today are the freshest guess at what the goods still
 * owed will cost. So does the lot the fill just closed, whenever nothing else
 * holds stock — an empty lot is read as "what a piece costs now" by
 * `toProduct`'s `maxCapital` (`product/live.ts`), and adopting the price lets the
 * rest of the purchase land in it instead of beside an empty husk.
 *
 * When every hole already carries the incoming capital there is nothing to
 * reconcile — adding into those lots values the leftovers exactly as filling
 * would — so this writes nothing and the receive path stays one event.
 *
 * Every step is a journalled event carrying `recordId`, so deleting the record
 * puts the lots back where they were (`touchedLots` in `record/live.ts` undoes a
 * record's own movement rather than trusting a replay); a capital-only change is
 * a delta-0 event, the same shape `adjustStatements` writes. Statements only —
 * `receiveAtCapital` adds the `touchProduct` when it commits the result.
 */
export function settleNegative(
  productId: string,
  lots: readonly StockLot[],
  input: { pcs: number; capital: number },
  now: number,
  fix: number,
  recordId: string | null = null,
): {
  statements: Statement[];
  lots: StockLot[];
  /** How many of the purchase's pcs the hole absorbed. */
  filled: number;
  /** The last journalled fill, which the record's portion points at. */
  eventId: string | null;
  stockId: string | null;
} {
  const holes = lots.filter((lot) => lot.value < 0);
  if (holes.every((lot) => sameCapital(lot.capital, input.capital, fix))) {
    return {
      statements: [],
      lots: lots.map((lot) => ({ ...lot })),
      filled: 0,
      eventId: null,
      stockId: null,
    };
  }

  const statements: Statement[] = [];
  const nextLots = lots.map((lot) => ({ ...lot }));
  let remaining = input.pcs;
  let eventId: string | null = null;
  let stockId: string | null = null;
  let filledIndex: number | null = null;

  // Newest first: `drainStatements` puts the shortage on the last lot, so this
  // undoes the drain in the order it happened.
  for (let index = nextLots.length - 1; index >= 0 && remaining > 0; index--) {
    const lot = nextLots[index];
    if (lot.value >= 0) continue;

    const fill = Math.min(remaining, -lot.value);
    eventId = generateId();
    stockId = lot.id;
    filledIndex = index;
    statements.push(
      {
        sql: "UPDATE stocks SET stock_value = stock_value + $1, stock_updated_at = $2 WHERE stock_id = $3",
        bindings: [fill, now, lot.id],
      },
      insertEvent(eventId, productId, lot.id, fill, lot.capital, now, "Tutup stok minus", recordId),
    );
    lot.value += fill;
    remaining -= fill;
  }

  // A bonus line (capital 0) says nothing about what goods cost, so it fills the
  // hole without revaluing it.
  if (filledIndex !== null && input.capital > 0) {
    const empty = nextLots.every((lot) => lot.value === 0);
    for (let index = 0; index < nextLots.length; index++) {
      const lot = nextLots[index];
      // Every lot still owed stock, plus the one this purchase just closed when
      // no lot holds stock any more — the arrival lands in it, not beside it.
      const adopt = lot.value < 0 || (empty && index === filledIndex);
      if (!adopt || sameCapital(lot.capital, input.capital, fix)) continue;
      lot.capital = input.capital;
      statements.push(
        {
          sql: "UPDATE stocks SET stock_capital = $1, stock_updated_at = $2 WHERE stock_id = $3",
          bindings: [input.capital, now, lot.id],
        },
        insertEvent(
          generateId(),
          productId,
          lot.id,
          0,
          input.capital,
          now,
          "Modal stok minus",
          recordId,
        ),
      );
    }
  }

  return { statements, lots: nextLots, filled: input.pcs - remaining, eventId, stockId };
}

/**
 * Receive a purchase quantity at `capital` per pc. If a lot already carries the
 * same capital (at the record's precision), the purchase points at it instead of
 * opening a duplicate lot. When several lots match, the newest stock is moved
 * into the oldest with their own journal events, so the chosen lot ends up
 * holding the combined quantity.
 *
 * Any oversold lot is closed off first by `settleNegative`, so the quantity that
 * lands here is the part of the purchase the product's stock did not already
 * owe. Two things stay the purchase's own either way, because the record paid
 * them and its total has to tie: `capital` (its price per pc) and the qty the
 * caller writes on the portion. `eventId` is the fill's event when the whole
 * quantity went into a hole, and the receipt's otherwise — a portion points at
 * one event, so a line split between a hole and a lot hangs off the receipt.
 */
export function receiveAtCapital(
  productId: string,
  lots: readonly StockLot[],
  input: { pcs: number; capital: number },
  now: number,
  fix: number,
  recordId: string | null = null,
): {
  statements: Statement[];
  eventId: string;
  stockId: string;
  lots: StockLot[];
  capital: number;
} {
  const settled = settleNegative(productId, lots, input, now, fix, recordId);
  const statements = settled.statements;
  const pcs = input.pcs - settled.filled;

  if (pcs <= 0) {
    return {
      statements: [...statements, touchProduct(productId, now)],
      eventId: settled.eventId!,
      stockId: settled.stockId!,
      lots: settled.lots,
      capital: input.capital,
    };
  }

  const matching = settled.lots.filter((lot) => sameCapital(lot.capital, input.capital, fix));

  if (matching.length === 0) {
    const received = receivePortion(productId, { value: pcs, capital: input.capital }, now, recordId);
    return {
      statements: [...statements, ...received.statements],
      eventId: received.eventId,
      stockId: received.stockId,
      lots: [...settled.lots, { id: received.stockId, value: pcs, capital: input.capital }],
      capital: input.capital,
    };
  }

  const nextLots = settled.lots;
  const target = nextLots.find((lot) => lot.id === matching[0].id)!;

  // Newest matching stock moves into the oldest matching lot. Two rows per
  // transfer keep both lots' journals honest; these are stock-only movements,
  // so they deliberately carry no record id.
  for (let index = matching.length - 1; index >= 1; index--) {
    const source = nextLots.find((lot) => lot.id === matching[index].id)!;
    if (source.value === 0) continue;
    statements.push(
      {
        sql: "UPDATE stocks SET stock_value = 0, stock_updated_at = $1 WHERE stock_id = $2",
        bindings: [now, source.id],
      },
      insertEvent(
        generateId(),
        productId,
        source.id,
        -source.value,
        source.capital,
        now,
        "Konsolidasi modal",
      ),
      insertEvent(
        generateId(),
        productId,
        target.id,
        source.value,
        target.capital,
        now,
        "Konsolidasi modal",
      ),
      {
        sql: "UPDATE stocks SET stock_value = stock_value + $1, stock_updated_at = $2 WHERE stock_id = $3",
        bindings: [source.value, now, target.id],
      },
    );
    target.value += source.value;
    source.value = 0;
  }

  const eventId = generateId();
  statements.push(
    {
      sql: "UPDATE stocks SET stock_value = stock_value + $1, stock_updated_at = $2 WHERE stock_id = $3",
      bindings: [pcs, now, target.id],
    },
    insertEvent(eventId, productId, target.id, pcs, target.capital, now, "", recordId),
    touchProduct(productId, now),
  );
  target.value += pcs;

  return {
    statements,
    eventId,
    stockId: target.id,
    lots: nextLots,
    capital: target.capital,
  };
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
