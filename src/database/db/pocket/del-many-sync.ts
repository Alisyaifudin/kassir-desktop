import { sqlx } from "~/database/sqlx";

export function deleteManyPocketSync(pockets: { id: string; deletedAt: number }[], now: number) {
  return sqlx.pocket.sync.delete.many(pockets, now);
}
