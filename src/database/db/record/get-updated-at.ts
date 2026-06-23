import { sqlx } from "~/database/sqlx";

export function getRecordsUpdatedAt(ids: string[]) {
  return sqlx.record.get.updatedAt(ids)
}
