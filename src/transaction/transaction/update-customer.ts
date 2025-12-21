import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function customer(
  tab: number,
  customer: { name: string; phone: string; id?: number }
): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute(
        `UPDATE transactions SET tx_customer_name = $1, tx_customer_phone = $2, tx_customer_id = $3 
             WHERE tab = $4`,
        [customer.name, customer.phone, customer.id ?? null, tab]
      ),
  });
  if (errMsg) return errMsg;
  return null;
}
