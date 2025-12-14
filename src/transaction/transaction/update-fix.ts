import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function fix(tab: number, fix: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_fix = $1 WHERE tab = $2`, [fix, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}
