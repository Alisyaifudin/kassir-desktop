import { sqlx } from "~/database/sqlx";

export function getPocketById(pocketId: string) {
  return sqlx.pocket.get.byId(pocketId);
}
