import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export type TabInfo = {
  tab: number;
  mode: TX.Mode;
};

export async function all(): Promise<Result<DefaultError, TabInfo[]>> {
  const tx = await getTX();
  const [errMsg, res] = await tryResult({
    run: () =>
      tx.select<{ tab: number; tx_mode: TX.Mode }[]>("SELECT tab, tx_mode FROM transactions"),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(res.map((r) => ({ tab: r.tab, mode: r.tx_mode })));
}
