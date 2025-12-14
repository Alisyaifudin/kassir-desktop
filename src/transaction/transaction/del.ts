import { DefaultError, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function del(tab: number): Promise<DefaultError | null> {
  const tx = await getTX();
  const [errMsg] = await tryResult({
    run: () => tx.select<{ count: number }[]>("DELETE FROM transactions WHERE tab = $1", [tab]),
  });
  return errMsg;
}
