import { sqlx } from "~/database/sqlx";

export function getCustomersLastSyncAt() {
  return sqlx.customer.get.lastSycnAt();
}
