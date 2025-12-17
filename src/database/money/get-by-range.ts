import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Money = {
  timestamp: number;
  value: number;
  kind: DB.MoneyEnum;
};

export async function getByRange(
  start: number,
  end: number
): Promise<Result<DefaultError, Money[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<DB.Money[]>("SELECT * FROM money WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC", [start, end]),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(res.map((r) => ({ timestamp: r.timestamp, value: r.money_value, kind: r.money_kind })));
}
