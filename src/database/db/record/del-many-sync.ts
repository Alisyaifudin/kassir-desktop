import { sqlx } from "~/database/sqlx";

export function deleteManyRecordsSync(deleted: { id: string; deletedAt: number }[], now: number) {
  return sqlx.record.sync.delete.many(deleted, now);
}
