import { sqlx } from "~/database/sqlx";

export function deleteRecordById(recordId: string) {
  return sqlx.record.delete.byId(recordId);
}
