import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";
import { RecordExtra } from "./get-by-range";

export async function getByTimestamp(
  timestamp: number
): Promise<Result<DefaultError, RecordExtra[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<DB.RecordExtra[]>("SELECT * FROM record_extras WHERE timestamp = $1", [timestamp]),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    res.map((r) => ({
      id: r.record_extra_id,
      name: r.record_extra_name,
      timestamp: r.timestamp,
      value: r.record_extra_value,
      eff: r.record_extra_eff,
      kind: r.record_extra_kind,
    }))
  );
}
