import { DB } from "../instance";
import Decimal from "decimal.js";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";

export type Record = {
  timestamp: number;
  paidAt: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: "buy" | "sell";
  pay: number;
  note: string;
  method: {
    id: number;
    name?: string;
    kind: DB.MethodEnum;
  };
  fix: number;
  customer: {
    name: string;
    phone: string;
  };
  subTotal: number;
  total: number;
  change: number;
  grandTotal: number;
};

type Output = DB.Record & { method_name: string | null; method_kind: DB.MethodEnum };

export function getByTimestamp(timestamp: number) {
  return Effect.gen(function* () {
    const records = yield* DB.try((db) =>
      db.select<Output[]>(
        `SELECT timestamp, record_paid_at, record_rounding, record_is_credit, record_cashier,
      record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
      record_sub_total, record_total, methods.method_id, method_name, method_kind 
      FROM records INNER JOIN methods ON records.method_id = methods.method_id
      WHERE timestamp = $1`,
        [timestamp],
      ),
    );
    if (records.length === 0) return yield* NotFound.fail("Catatan tidak ditemukan");
    const r = records[0];
    const grandTotal = new Decimal(r.record_total).plus(r.record_rounding);
    const change = new Decimal(r.record_pay).minus(grandTotal);
    const record: Record = {
      change: Number(change.toFixed(r.record_fix)),
      grandTotal: Number(grandTotal.toFixed(r.record_fix)),
      customer: {
        name: r.record_customer_name,
        phone: r.record_customer_phone,
      },
      cashier: r.record_cashier,
      fix: isNaN(r.record_fix) || r.record_fix < 0 || r.record_fix > 5 ? 0 : r.record_fix,
      isCredit: Boolean(r.record_is_credit),
      method: {
        id: r.method_id,
        name: r.method_name ?? undefined,
        kind: r.method_kind,
      },
      mode: r.record_mode,
      note: r.record_note,
      paidAt: r.record_paid_at,
      pay: r.record_pay,
      rounding: r.record_rounding,
      subTotal: r.record_sub_total,
      timestamp: r.timestamp,
      total: r.record_total,
    };
    return record;
  });
}
