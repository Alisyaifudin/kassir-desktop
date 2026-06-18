import { sqlx } from "~/database/sqlx";

export function getCapitalsUpdatedAt(ids: string[]) {
  return sqlx.capital.get.updatedAt(ids);
}
