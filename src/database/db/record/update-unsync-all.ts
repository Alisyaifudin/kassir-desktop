import { sqlx } from "~/database/sqlx";

export function updateUnsyncAllRecords() {
  return sqlx.record.update.unsyncAll();
}
