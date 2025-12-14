import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "./db-instance";

export async function clear(tab: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute(
        `UPDATE transactions SET tx_fix = 0, tx_method_id = 1000, tx_note = '', tx_query = '',
         tx_customer_name = '', tx_customer_phone = '', tx_customer_is_new = 0, tx_product_name = '',
         tx_product_barcode = '', tx_product_price = 0, tx_product_qty = 0, tx_product_stock = 0,
         tx_extra_name = '', tx_extra_value = 0, tx_extra_kind = 'percent', tx_extra_is_saved = 0
         WHERE tab = $1;
         DELETE FROM products WHERE tab = $1;
         DELETE FROM extras WHERE tab = $1;
       `,
        [tab],
      ),
  });
  return errMsg;
}
