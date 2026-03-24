import { ExtraFull, cache } from "./cache";
import { DB } from "../instance";
import { Effect } from "effect";

export function upsert({ name, value, kind, id, updatedAt }: Omit<ExtraFull, "syncAt">) {
  const now = Date.now();
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(
        `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, extra_updated_at, extra_sync_at) 
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO UPDATE SET
         extra_name = excluded.extra_name,
         extra_value = excluded.extra_value,
         extra_kind = excluded.extra_kind,
         extra_updated_at = excluded.extra_updated_at,
         extra_sync_at = excluded.extra_sync_at
         `,
        [id, name, value, kind, updatedAt, now],
      ),
    );

    cache.update(id, {
      id,
      name,
      value,
      kind,
      updatedAt,
      syncAt: now,
    });
    return id;
  });
}
