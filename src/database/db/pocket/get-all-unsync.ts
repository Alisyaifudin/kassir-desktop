import { sqlx } from "~/database/sqlx";

export function getAllUnsyncPocket() {
  return sqlx.pocket.get.allUnsync();
}
