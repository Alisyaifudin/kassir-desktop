import { sqlx } from "~/database/sqlx";

export function getAllUnsync() {
  return sqlx.customer.get.allUnsync();
}
