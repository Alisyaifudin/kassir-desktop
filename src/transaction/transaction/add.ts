import { DefaultError, err, log, ok, Result, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";
import { count as getCount } from "./count";

export async function add(): Promise<Result<DefaultError | "Terlalu banyak", number>> {
  const tx = await getTX();
  const [errCount, count] = await getCount();
  if (errCount !== null) return err(errCount);
  if (count >= 100) {
    return err("Terlalu banyak");
  }
  const [errMsg, res] = await tryResult({
    run: async () => tx.execute("INSERT INTO transactions DEFAULT VALUES"),
  });
  if (errMsg) return err(errMsg);
  const id = res.lastInsertId;
  if (id === undefined) {
    log.error("Failed to insert new transaction");
    return err("Aplikasi bermasalah");
  }
  return ok(id);
}
