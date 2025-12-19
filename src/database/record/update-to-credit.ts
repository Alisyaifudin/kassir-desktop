import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateToCredit(timestamp: number): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        "UPDATE records SET record_is_credit = 1, record_pay = 0, record_rounding = 0 WHERE timestamp = $1",
        [timestamp]
      ),
  });
  return errMsg;
}
