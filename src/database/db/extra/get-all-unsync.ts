import { sqlx } from "~/database/sqlx";

export function getAllExtrasUnsync() {
  return sqlx.extra.get.allUnsync();
}
