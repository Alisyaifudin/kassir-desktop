import { sqlx } from "~/database/sqlx";

export function deleteCapitalById(id: string) {
  return sqlx.capital.delete.byId(id);
}
