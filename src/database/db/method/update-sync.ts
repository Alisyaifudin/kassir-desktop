import { Effect } from "effect";
import { DB } from "../instance";
import { cache } from "./cache";

type Input = {
  id: string;
  name?: string;
  kind: DB.MethodEnum;
  deletedAt: number | null;
  updatedAt?: number;
};

export function updateSync({ id, name, kind, deletedAt, updatedAt }: Input) {
  const now = Date.now();
  const effectiveUpdatedAt = updatedAt ?? now;
  return DB.try((db) =>
    db.execute(
      `UPDATE methods SET method_name = $1, method_kind = $2, method_deleted_at = $3,
       method_updated_at = $4, method_sync_at = $5 WHERE method_id = $6`,
      [name ?? null, kind, deletedAt, effectiveUpdatedAt, effectiveUpdatedAt, id],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({
        ...prev,
        name: name ?? undefined,
        kind,
        deletedAt,
        updatedAt: effectiveUpdatedAt,
        syncAt: effectiveUpdatedAt,
      }));
    }),
    Effect.asVoid,
  );
}
