import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type RecordExtra = {
  id: number;
  name: string;
  timestamp: number;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

export async function getByRange(
  start: number,
  end: number
): Promise<Result<DefaultError, RecordExtra[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<DB.RecordExtra[]>("SELECT * FROM record_extras WHERE timestamp BETWEEN $1 AND $2", [
        start,
        end,
      ]),
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
