import { Effect } from "effect";
import { DB } from "../instance";

export function getByRecordId(recordId: string) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.RecordExtra[]>("SELECT * FROM record_extras WHERE record_id = $1", [recordId]),
    );
    return res.map((r) => ({
      id: r.record_extra_id,
      name: r.record_extra_name,
      recordId: r.record_id,
      value: r.record_extra_value,
      eff: r.record_extra_eff,
      kind: r.record_extra_kind,
    }));
  });
}
