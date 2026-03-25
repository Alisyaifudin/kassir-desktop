import { DB } from "../instance";
import { Effect } from "effect";

export type RecordExtra = {
  id: string;
  name: string;
  recordId: string;
  value: number;
  eff: number;
  kind: DB.ValueKind;
};

export function getByRange(start: number, end: number) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.RecordExtra[]>(
        `SELECT record_extra_id, record_extra_name, record_extras.record_id, record_extra_value, 
         record_extra_eff, record_extra_kind 
         FROM record_extras INNER JOIN records ON records.record_id = record_extras.record_id
         WHERE record_paid_at BETWEEN $1 AND $2`,
        [start, end],
      ),
    );
    const data: RecordExtra[] = res.map((r) => ({
      id: r.record_extra_id,
      name: r.record_extra_name,
      recordId: r.record_id,
      value: r.record_extra_value,
      eff: r.record_extra_eff,
      kind: r.record_extra_kind,
    }));
    return data;
  });
}
