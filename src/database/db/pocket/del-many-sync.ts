import { sqlx } from "~/database/sqlx";

export function deleteManyPocketSync(ids: string[], now: number) {
  return sqlx.pocket.sync.delete.many(ids, now);
}
