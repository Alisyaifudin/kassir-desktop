import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function query(tab: number, query: string): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.execute(`UPDATE transactions SET tx_query = $1 WHERE tab = $2`, [query, tab]),
  });
  if (errMsg) return errMsg;
  return null;
}
