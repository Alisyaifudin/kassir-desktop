import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export const product = {
  name,
  barcode,
  price,
  qty,
  stock,
  clear,
};

async function name(tab: number, v: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_product_name = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function barcode(tab: number, v: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute(`UPDATE transactions SET tx_product_barcode = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function price(tab: number, v: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_product_price = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function qty(tab: number, v: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_product_qty = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function stock(tab: number, v: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_product_stock = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function clear(tab: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute(
        `UPDATE transactions SET tx_product_stock = 0, tx_product_qty = 0, tx_product_price = 0,
         tx_product_name = '', tx_product_barcode = '' WHERE tab = $1`,
        [tab],
      ),
  });
  if (errMsg) return errMsg;
  return null;
}
