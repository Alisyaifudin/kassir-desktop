import { Effect } from "effect";
import { TX } from "./instance";

export function clear(tab: number) {
  return TX.try((tx) =>
    tx.execute(
      `UPDATE transactions SET tx_fix = 0, tx_method_id = 1000, tx_note = '', tx_query = '',
         tx_customer_name = '', tx_customer_phone = '', tx_customer_id = null, tx_product_name = '',
         tx_product_barcode = '', tx_product_price = 0, tx_product_qty = 0, tx_product_stock = 0,
         tx_extra_name = '', tx_extra_value = 0, tx_extra_kind = 'percent', tx_extra_is_saved = 0
         WHERE tab = $1;
         DELETE FROM products WHERE tab = $1;
         DELETE FROM extras WHERE tab = $1;
       `,
      [tab],
    ),
  ).pipe(Effect.asVoid);
}
