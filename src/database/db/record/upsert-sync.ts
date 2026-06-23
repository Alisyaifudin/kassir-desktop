import { sqlx } from "~/database/sqlx";
import { UpsertRecord } from "~/database/sqlx/record/upsert-sync";

export function upsertRecordSync(record: UpsertRecord, now: number) {
  return sqlx.record.sync.upsert.one(record, now);
}
