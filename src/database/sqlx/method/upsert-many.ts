import { DB } from "../instance";
import { Effect } from "effect";

export function upsertManyMethods(
  methods: {
    id: string;
    name?: string;
    label?: string;
    kind: DB.MethodEnum;
    updatedAt: number;
  }[],
  now: number,
) {
  let bindingIndex = 1;
  const placeholders = methods
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
        $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = methods.flatMap(({ id, name, label, kind, updatedAt }) => [
    id,
    name,
    label,
    kind,
    null,
    updatedAt,
    now,
  ]);
  return DB.execute(
    `INSERT INTO methods (method_id, method_name, method_label,
     method_kind, method_deleted_at, method_updated_at, method_sync_at) 
     VALUES ${placeholders} ON CONFLICT (method_id) DO UPDATE SET
     method_name = excluded.method_name,
     method_label = excluded.method_label,
     method_kind = excluded.method_kind,
     method_deleted_at = excluded.method_deleted_at,
     method_updated_at = excluded.method_updated_at,
     method_sync_at = excluded.method_sync_at`,
    bindings,
  ).pipe(Effect.as(methods.map((method) => method.id)));
}
