import { sqlx } from "~/database/sqlx";

export function updateManyPocketSyncAt(ids: string[], now: number) {
  return sqlx.pocket.sync.update.many.syncAt(ids, now);
}
