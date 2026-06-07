import { DB } from "../instance";
import { Effect } from "effect";

export function upsertManyExtras({
  extras,
  now,
}: {
  extras: {
    id: string;
    name: string;
    value: number;
    kind: DB.ValueKind;
    updatedAt: number;
  }[];
  now: number;
}) {
  let bindingIndex = 1;
  const placeholders = extras
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
        $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = extras.flatMap(({ id, name, value, kind, updatedAt }) => [
    id,
    name,
    value,
    kind,
    updatedAt,
    now,
    null,
  ]);
  return DB.execute(
    `INSERT INTO extras (extra_id, extra_name, extra_value, extra_kind, 
    extra_updated_at, extra_sync_at, extra_deleted_at)
    VALUES ${placeholders} ON CONFLICT (extra_id) DO UPDATE SET 
    extra_name = excluded.extra_name,
    extra_value = excluded.extra_value,
    extra_kind = excluded.extra_kind,
    extra_updated_at = excluded.extra_updated_at,
    extra_sync_at = excluded.extra_sync_at,
    extra_deleted_at = excluded.extra_deleted_at`,
    bindings,
  ).pipe(Effect.as(extras.map((extra) => extra.id)));
}
