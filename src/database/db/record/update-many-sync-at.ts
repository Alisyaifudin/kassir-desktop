import { sqlx } from "~/database/sqlx";

export function updateManyRecordsSyncAt(ids: string[], now: number) {
  return sqlx.record.sync.update.many.syncAt(ids, now);
}
