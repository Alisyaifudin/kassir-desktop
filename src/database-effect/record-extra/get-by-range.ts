import { DB } from "../instance";
import { Effect } from "effect";

export type RecordExtra = {
  id: number;
  name: string;
  timestamp: number;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

export function getByRange(start: number, end: number) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.RecordExtra[]>("SELECT * FROM record_extras WHERE timestamp BETWEEN $1 AND $2", [
        start,
        end,
      ]),
    );
    const data: RecordExtra[] = res.map((r) => ({
      id: r.record_extra_id,
      name: r.record_extra_name,
      timestamp: r.timestamp,
      value: r.record_extra_value,
      eff: r.record_extra_eff,
      kind: r.record_extra_kind,
    }));
    return data;
  });
}
