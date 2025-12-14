import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export const extra = {
  name,
  value,
  kind,
  saved,
  clear,
};

async function name(tab: number, v: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_extra_name = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function value(tab: number, v: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_extra_value = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function kind(tab: number, v: TX.ValueKind): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_extra_kind = $1 WHERE tab = $2`, [v, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function saved(tab: number, v: boolean): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute(`UPDATE transactions SET tx_extra_saved = $1 WHERE tab = $2`, [v ? 1 : 0, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}

async function clear(tab: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute(
        `UPDATE transactions SET tx_extra_saved = 0, tx_extra_name = '', tx_extra_value = 0,
         tx_extra_kind = 'percent' WHERE tab = $1`,
        [tab],
      ),
  });
  if (errMsg) return errMsg;
  return null;
}
