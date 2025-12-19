import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updatePayCredit({
  timestamp,
  pay,
  rounding,
}: {
  timestamp: number;
  pay: number;
  rounding: number;
}): Promise<DefaultError | null> {
  const db = await getDB();
  const now = Date.now();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute(
        "UPDATE records SET record_is_credit = 0, record_pay = $1, record_rounding = $2, record_paid_at = $3 WHERE timestamp = $4",
        [pay, rounding, now, timestamp]
      ),
  });
  return errMsg;
}
