import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function add(value: number, kind: DB.MoneyEnum): Promise<DefaultError | null> {
  const db = await getDB();
  const timestamp = Date.now();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("INSERT INTO money (timestamp, money_kind, money_value) VALUES ($1, $2, $3)", [
        timestamp,
        kind,
        value,
      ]),
  });
  return errMsg;
}
