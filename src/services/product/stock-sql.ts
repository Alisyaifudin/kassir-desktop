import { generateId } from "~/lib/random";
import type { Statement } from "../db";

export type StockLot = { id: string; value: number; capital: number };

/** Bump the aggregate timestamp and clear its sync flag. */
export function touchProduct(productId: string, now: number): Statement {
  return {
    sql: "UPDATE products SET product_updated_at = $1, product_sync_at = NULL WHERE product_id = $2",
    bindings: [now, productId],
  };
}

function insertEvent(
  productId: string,
  stockId: string,
  delta: number,
  capital: number,
  now: number,
  note = "",
): Statement {
  return {
    sql: `INSERT INTO product_events (
        product_event_id, product_event_created_at, product_event_sync_at,
        product_event_value, product_event_capital, product_id, stock_id, product_event_note
      ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)`,
    bindings: [generateId(), now, delta, capital, productId, stockId, note],
  };
}

/** A new cost lot plus its positive opening event. */
export function receiveStatements(
  productId: string,
  input: { value: number; capital: number },
  now: number,
): Statement[] {
  const stockId = generateId();
  return [
    {
      sql: `INSERT INTO stocks (
          stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
      bindings: [stockId, productId, input.value, input.capital, now, now],
    },
    insertEvent(productId, stockId, input.value, input.capital, now),
    touchProduct(productId, now),
  ];
}

/**
 * FIFO consumption across lots (oldest first). Returns the statements plus any
 * remaining shortage; the caller must fail when `shortage > 0`.
 */
export function consumeStatements(
  productId: string,
  lots: readonly StockLot[],
  pcs: number,
  now: number,
  note = "",
): { statements: Statement[]; shortage: number } {
  const statements: Statement[] = [];
  let remaining = pcs;

  for (const lot of lots) {
    if (remaining <= 0) break;
    if (lot.value <= 0) continue;

    const take = Math.min(lot.value, remaining);
    statements.push({
      sql: "UPDATE stocks SET stock_value = stock_value - $1, stock_updated_at = $2 WHERE stock_id = $3",
      bindings: [take, now, lot.id],
    });
    statements.push(insertEvent(productId, lot.id, -take, lot.capital, now, note));
    remaining -= take;
  }

  if (statements.length > 0) statements.push(touchProduct(productId, now));
  return { statements, shortage: remaining };
}

/** Manual correction of a lot; a capital-only change is a delta-0 event. */
export function adjustStatements(
  productId: string,
  lot: StockLot,
  next: { value: number; capital: number },
  now: number,
): Statement[] {
  return [
    {
      sql: "UPDATE stocks SET stock_value = $1, stock_capital = $2, stock_updated_at = $3 WHERE stock_id = $4",
      bindings: [next.value, next.capital, now, lot.id],
    },
    insertEvent(productId, lot.id, next.value - lot.value, next.capital, now),
    touchProduct(productId, now),
  ];
}
