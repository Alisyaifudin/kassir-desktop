import { DB } from "../instance";
import { Effect } from "effect";

export type Record = {
  id: string;
  paidAt: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: "buy" | "sell";
  pay: number;
  note: string;
  method: {
    id: string;
    name?: string;
    kind: DB.MethodEnum;
  };
  fix: number;
  customer: {
    name: string;
    phone: string;
  };
  subtotal: number;
  total: number;
};

type Output = DB.Record & { method_name: string | null; method_kind: DB.MethodEnum };

export function getByRange(start: number, end: number) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<Output[]>(
        `SELECT record_id, record_paid_at, record_rounding, record_is_credit, record_cashier,
        record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
        record_sub_total, record_total, methods.method_id, method_name, method_kind 
        FROM records INNER JOIN methods ON records.method_id = methods.method_id
        WHERE record_paid_at BETWEEN $1 AND $2
        ORDER BY record_paid_at`,
        [start, end],
      ),
    );
    const data: Record[] = res.map((r) => ({
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
      subtotal: r.record_sub_total,
      id: r.record_id,
      total: r.record_total,
    }));
    return data;
  });
}
