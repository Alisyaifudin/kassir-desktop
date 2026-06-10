import { DB } from "../instance";
import { Effect } from "effect";

export function getMoneyUpdatedAt(ids: string[]) {
  if (ids.length === 0) return Effect.succeed([] as { id: string; updatedAt: number }[]);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  return DB.select<Pick<DB.Money, "money_updated_at" | "money_id">[]>(
    `SELECT money_updated_at, money_id FROM money
    WHERE money_deleted_at IS NULL AND money_id IN (${placeholders})`,
    ids,
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.money_id,
        updatedAt: r.money_updated_at,
      })),
    ),
  );
}
