import { DefaultError, err, ok, ResultOld, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function count(): Promise<ResultOld<DefaultError, number>> {
  const tx = await getTX();
  const [errMsg, res] = await tryResult({
    run: () => tx.select<{ count: number }[]>("SELECT COUNT(*) as count FROM transactions"),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(res[0].count);
}
