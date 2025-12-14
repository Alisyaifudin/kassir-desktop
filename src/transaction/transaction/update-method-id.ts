import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function methodId(tab: number, methodId: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () =>
      tx.execute(`UPDATE transactions SET tx_method_id = $1 WHERE tab = $2`, [methodId, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}
