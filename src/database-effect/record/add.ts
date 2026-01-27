import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

type Input = {
  isCredit: boolean;
  cashier: string;
  mode: DB.Mode;
  pay: number;
  rounding: number;
  note: string;
  methodId: number;
  fix: number;
  customer: {
    name: string;
    phone: string;
  };
  subtotal: number;
  total: number;
};

export async function add({
  cashier,
  customer,
  fix,
  isCredit,
  methodId,
  mode,
  rounding,
  note,
  pay,
  subtotal,
  total,
}: Input): Promise<Result<DefaultError, number>> {
  const db = await getDB();
  const timestamp = Date.now();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        `INSERT INTO records (timestamp, record_paid_at, record_rounding, record_is_credit, record_cashier, record_mode, record_pay, record_note, 
        method_id, record_fix, record_customer_name, record_customer_phone, record_sub_total, record_total)
        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          timestamp,
          rounding,
          isCredit ? 1 : 0,
          cashier,
          mode,
          pay,
          note,
          methodId,
          fix,
          customer.name,
          customer.phone,
          subtotal,
          total,
        ]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(timestamp);
}
