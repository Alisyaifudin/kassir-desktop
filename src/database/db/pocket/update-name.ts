import { sqlx } from "~/database/sqlx";

export function updatePocketName(id: string, name: string) {
  const now = Date.now();
  return sqlx.pocket.update.name({ id, name }, now);
}
