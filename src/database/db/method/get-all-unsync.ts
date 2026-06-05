import { sqlx } from "~/database/sqlx";

export function getAllUnsyncMethods() {
  return sqlx.method.get.unsync();
}
