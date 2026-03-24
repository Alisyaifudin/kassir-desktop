import { Effect } from "effect";
import { TX } from "../instance";

export const extra = {
  name,
  value,
  kind,
  clear,
};

function name(tab: number, v: string) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_extra_name = $1 WHERE tab = $2`, [v, tab]),
  ).pipe(Effect.asVoid);
}

function value(tab: number, v: number) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_extra_value = $1 WHERE tab = $2`, [v, tab]),
  ).pipe(Effect.asVoid);
}

function kind(tab: number, v: TX.ValueKind) {
  return TX.try((tx) =>
    tx.execute(`UPDATE transactions SET tx_extra_kind = $1 WHERE tab = $2`, [v, tab]),
  ).pipe(Effect.asVoid);
}

function clear(tab: number) {
  return TX.try((tx) =>
    tx.execute(
      `UPDATE transactions SET tx_extra_name = '', tx_extra_value = 0,
       tx_extra_kind = 'percent' WHERE tab = $1`,
      [tab],
    ),
  ).pipe(Effect.asVoid);
}
