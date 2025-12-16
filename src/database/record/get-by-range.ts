import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Record = {
  timestamp: number;
  paidAt: number;
  ronding: number;
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
};

export async function getByRange(
  start: number,
  end: number
): Promise<Result<DefaultError, Record[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult<
    (DB.Record & { method_name: string | null; method_kind: DB.MethodEnum })[]
  >({
    run: () =>
      db.select(
        `SELECT timestamp, record_paid_at, record_rounding, record_is_credit, record_cashier,
      record_mode, record_pay, record_note, record_fix, record_customer_name, record_customer_phone,
      record_sub_total, record_total, methods.method_id, method_name, method_kind 
      FROM records INNER JOIN methods ON records.method_id = methods.method_id
      WHERE timestamp BETWEEN $1 AND $2`,
        [start, end]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    res.map((r) => ({
      customer: {
        name: r.record_customer_name,
        phone: r.record_customer_phone,
      },
      cashier: r.record_cashier,
      fix: r.record_fix,
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
      ronding: r.record_rounding,
      subTotal: r.record_sub_total,
      timestamp: r.timestamp,
      total: r.record_total,
    }))
  );
}
