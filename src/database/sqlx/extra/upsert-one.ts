import { DB } from "../instance";
import { Effect } from "effect";

export function upsertOneExtra({
  id,
  name,
  value,
  kind,
  updatedAt,
  now,
}: {
  id: string;
  name: string;
  value: number;
  kind: DB.ValueKind;
  updatedAt: number;
  now: number;
}) {
  return DB.execute(
    `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, 
    extra_updated_at, extra_sync_at, extra_deleted_at)
    VALUES ($1, $2, $3, $4, $5, $6, null) ON CONFLICT DO UPDATE SET
    extra_name = excluded.extra_name,
    extra_value = excluded.extra_value,
    extra_kind = excluded.extra_kind,
    extra_updated_at = excluded.extra_updated_at,
    extra_sync_at = excluded.extra_sync_at,
    extra_deleted_at = excluded.extra_deleted_at`,
    [id, name, value, kind, updatedAt, now],
  ).pipe(Effect.as(id));
}
