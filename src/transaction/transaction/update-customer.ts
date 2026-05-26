import { Effect } from "effect";
import { TX } from "../instance";

export function customer(tab: number, customer: { name: string; phone: string; id?: string }) {
  return TX.try((tx) =>
    tx.execute(
      `UPDATE transactions SET tx_customer_name = $1, tx_customer_phone = $2, tx_customer_id = $3 
       WHERE tab = $4`,
      [customer.name, customer.phone, customer.id ?? null, tab],
    ),
  ).pipe(Effect.asVoid);
}
