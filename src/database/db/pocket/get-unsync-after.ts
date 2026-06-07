import { sqlx } from "~/database/sqlx";

export function getUnsyncPocketAfter(timestamp: number) {
  return sqlx.pocket.get.unsync.after(timestamp);
}
