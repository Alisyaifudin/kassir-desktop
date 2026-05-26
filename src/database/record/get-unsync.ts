import { DB } from "../instance";
import { Effect } from "effect";

type Record = {
  id: string;
  paidAt: number;
  rounding: number;
  isCredit: boolean;
  cashier: string;
  mode: "buy" | "sell";
  pay: number;
  note: string;
  methodId: string;
  fix: number;
  customer: {
    name: string;
    phone: string;
  };
  subtotal: number;
  total: number;
  updatedAt: number;
};

const LIMIT = 1000;

export function getUnsync(before: number) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.Record[]>(
        `SELECT record_id, record_paid_at, record_updated_at, record_rounding, record_is_credit, record_cashier,
        record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
        record_sub_total, record_total, method_id 
        FROM records 
        WHERE record_updated_at < $1 AND record_sync_at IS NULL
        ORDER BY record_updated_at
        LIMIT $2`,
        [before, LIMIT],
      ),
    );
    const data: Record[] = res.map((r) => ({
      customer: {
        name: r.record_customer_name,
        phone: r.record_customer_phone,
      },
      updatedAt: r.record_updated_at,
      cashier: r.record_cashier,
      fix: isNaN(r.record_fix) || r.record_fix < 0 || r.record_fix > 5 ? 0 : r.record_fix,
      isCredit: Boolean(r.record_is_credit),
      methodId: r.method_id,
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
