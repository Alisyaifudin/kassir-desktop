import { sqlx } from "~/database/sqlx";

export function updatePocketType(id: string, type: DB.PocketType) {
  const now = Date.now();
  return sqlx.pocket.update.type({ id, type }, now);
}
