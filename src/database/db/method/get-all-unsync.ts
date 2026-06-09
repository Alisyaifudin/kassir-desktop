import { sqlx } from "~/database/sqlx";

export function getAllUnsync() {
  return sqlx.method.get.allUnsync();
}
