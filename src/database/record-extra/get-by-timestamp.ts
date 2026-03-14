import { Effect } from "effect";
import { DB } from "../instance";

export function getByTimestamp(timestamp: number) {
  return Effect.gen(function* () {
    const res = yield* DB.try((db) =>
      db.select<DB.RecordExtra[]>("SELECT * FROM record_extras WHERE timestamp = $1", [timestamp]),
    );
    return res.map((r) => ({
      id: r.record_extra_id,
      name: r.record_extra_name,
      timestamp: r.timestamp,
      value: r.record_extra_value,
      eff: r.record_extra_eff,
      kind: r.record_extra_kind,
    }));
  });
}
