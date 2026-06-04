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

export function addSync({ id, name, kind, deletedAt, updatedAt }: Input) {
  const now = Date.now();
  const effectiveUpdatedAt = updatedAt ?? now;
  return DB.try((db) =>
    db.execute(
      `INSERT INTO methods (method_id, method_name, method_kind, method_deleted_at, 
       method_updated_at, method_sync_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name ?? null, kind, deletedAt, effectiveUpdatedAt, effectiveUpdatedAt],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, {
        id,
        name: name ?? undefined,
        kind,
        deletedAt,
        updatedAt: effectiveUpdatedAt,
        syncAt: effectiveUpdatedAt,
      });
    }),
    Effect.asVoid,
  );
}
