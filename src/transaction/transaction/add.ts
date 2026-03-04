import { DefaultError, err, logOld, ok, ResultOld, tryResult } from "~/lib/utils";
import { getTX } from "../db-instance";
import { count as getCount } from "./count";

type Input = {
  mode: TX.Mode;
  fix: number;
  methodId: number;
  note: string;
};

export async function add({
  mode,
  fix,
  methodId,
  note,
}: Input): Promise<ResultOld<DefaultError | "Terlalu banyak", number>> {
  const tx = await getTX();
  const [errCount, count] = await getCount();
  if (errCount !== null) return err(errCount);
  if (count >= 100) {
    return err("Terlalu banyak");
  }
  const [errMsg, res] = await tryResult({
    run: async () =>
      tx.execute(
        "INSERT INTO transactions (tx_mode, tx_fix, tx_method_id, tx_note) VALUES ($1, $2, $3, $4)",
        [mode, fix, methodId, note],
      ),
  });
  if (errMsg) return err(errMsg);
  const id = res.lastInsertId;
  if (id === undefined) {
    logOld.error("Failed to insert new transaction");
    return err("Aplikasi bermasalah");
  }
  return ok(id);
}
