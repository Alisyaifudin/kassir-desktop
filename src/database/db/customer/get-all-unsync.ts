import { sqlx } from "~/database/sqlx";

export function getAllUnsyncCustomers() {
  return sqlx.customer.get.allUnsync();
}
