import { sqlx } from "~/database/sqlx";

export function deletePocketById(id: string) {
  return sqlx.pocket.delete.byId(id);
}
