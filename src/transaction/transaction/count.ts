import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";

export async function count(): Promise<Result<DefaultError, number>> {
  const tx = await getTX();
  const [errMsg, res] = await tryResult({
    run: () => tx.select<{ count: number }[]>("SELECT COUNT(*) as count FROM transactions"),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(res[0].count);
}
