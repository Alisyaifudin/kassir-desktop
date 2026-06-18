import { sqlx } from "~/database/sqlx";

export function deleteManyCapitalsSync(
  deleted: {
    id: string;
    deletedAt: number;
  }[],
  now: number,
) {
  return sqlx.capital.sync.delete.many(deleted, now);
}
