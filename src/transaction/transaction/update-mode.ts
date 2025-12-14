import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function mode(tab: number, mode: TX.Mode): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_mode = $1 WHERE tab = $2`, [mode, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}
