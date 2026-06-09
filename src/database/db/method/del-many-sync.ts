import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteManyMethodsSync(
  deleted: {
    id: string;
    deletedAt: number;
  }[],
  now: number,
) {
  return sqlx.method.sync.delete
    .many(deleted, now)
    .pipe(Effect.tap(() => deleted.forEach((item) => cache.delete(item.id))));
}
