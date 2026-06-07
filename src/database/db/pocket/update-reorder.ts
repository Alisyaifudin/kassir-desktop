import { sqlx } from "~/database/sqlx";

export function updatePocketReorder(items: { order: number; id: string }[]) {
  const now = Date.now();
  return sqlx.pocket.update.reorder(items, now);
}
