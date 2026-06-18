import { sqlx } from "~/database/sqlx";

export function updateManyCapitalsSyncAt(ids: string[], now: number) {
  return sqlx.capital.sync.update.many.syncAt(ids, now);
}
