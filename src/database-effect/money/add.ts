import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function add(
  value: number,
  kind: DB.MoneyEnum,
  note: string,
): Promise<DefaultError | null> {
  const db = await getDB();
  const timestamp = Date.now();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        "INSERT INTO money (timestamp, money_kind, money_value, note) VALUES ($1, $2, $3, $4)",
        [timestamp, kind, value, note],
      ),
  });
  return errMsg;
}
