import { TX } from "../instance";
import { Effect } from "effect";

export const product = {
  name,
  barcode,
  price,
  qty,
  clear,
};

function name(tab: number, v: string) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_product_name = $1 WHERE tab = $2`, [v, tab]),
  ).pipe(Effect.asVoid);
}

function barcode(tab: number, v: string) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_product_barcode = $1 WHERE tab = $2`, [v, tab]),
  ).pipe(Effect.asVoid);
}

function price(tab: number, v: number) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_product_price = $1 WHERE tab = $2`, [v, tab]),
  ).pipe(Effect.asVoid);
}

function qty(tab: number, v: number) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_product_qty = $1 WHERE tab = $2`, [v, tab]),
  ).pipe(Effect.asVoid);
}

function clear(tab: number) {
  return TX.try((tx) =>
    tx.execute(
      `UPDATE transactions SET tx_product_qty = 0, tx_product_price = 0,
         tx_product_name = '', tx_product_barcode = '' WHERE tab = $1`,
      [tab],
    ),
  ).pipe(Effect.asVoid);
}
