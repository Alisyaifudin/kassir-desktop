import { sqlx } from "~/database/sqlx";

export function getUnsyncCustomersAfter(timestamp: number) {
  return sqlx.customer.get.unsync.after(timestamp);
}
