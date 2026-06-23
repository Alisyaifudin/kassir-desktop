import { sqlx } from "~/database/sqlx";
import { NewRecord } from "~/database/sqlx/record/add-new";

export function addNewRecord(tx: NewRecord) {
  return sqlx.record.add.new(tx);
}
