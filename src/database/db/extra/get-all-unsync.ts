import { sqlx } from "~/database/sqlx";

export function getAllUnsyncExtra() {
  return sqlx.extra.get.unsync();
}
