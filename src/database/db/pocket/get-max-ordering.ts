import { sqlx } from "~/database/sqlx";

export function getMaxPocketOrdering() {
  return sqlx.pocket.get.maxOrdering();
}
