import { DB } from "../instance";
import { Effect } from "effect";

export function getMethodsUpdatedAt(ids: string[]) {
  if (ids.length === 0) return Effect.succeed([] as { id: string; updatedAt: number }[]);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  return DB.select<Pick<DBNamespace.Method, "method_updated_at" | "method_id">[]>(
    `SELECT method_updated_at, method_id FROM methods
    WHERE method_deleted_at IS NULL AND method_id IN (${placeholders})`,
    ids,
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.method_id,
        updatedAt: r.method_updated_at,
      })),
    ),
  );
}
