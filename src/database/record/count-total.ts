import { Effect } from "effect";
import { DB } from "../instance";
import Decimal from "decimal.js";

export function countTotal(start: number, end: number, mode: DB.Mode) {
  return DB.try((db) =>
    db.select<{ record_fix: number; record_rounding: number; record_total: number }[]>(
      `SELECT record_fix, record_rounding, record_total FROM records WHERE record_paid_at BETWEEN $1 AND $2 AND record_mode = $3`,
      [start, end, mode],
    ),
  ).pipe(
    Effect.map((r) => {
      let total = new Decimal(0);
      for (const item of r) {
        const grandTotal = new Decimal(item.record_total)
          .plus(item.record_rounding)
          .toFixed(item.record_fix);
        total = total.plus(grandTotal);
      }
      return total.toNumber();
    }),
  );
}
