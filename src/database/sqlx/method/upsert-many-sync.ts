import { DB } from "../instance";
import { Effect } from "effect";

export function upsertManyMethods(
  methods: {
    id: string;
    name?: string;
    kind: DBNamespace.MethodEnum;
    updatedAt: number;
  }[],
  now: number,
) {
  if (methods.length === 0) return Effect.succeed([] as string[]);
  let bindingIndex = 1;
  const placeholders = methods
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++},
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = methods.flatMap(({ id, name, kind, updatedAt }) => [
    id,
    name ?? null,
    kind,
    updatedAt,
    now,
    null,
  ]);
  return DB.execute(
    `INSERT INTO methods (method_id, method_name, method_kind,
    method_updated_at, method_sync_at, method_deleted_at)
    VALUES ${placeholders} ON CONFLICT (method_id) DO UPDATE SET
    method_name = excluded.method_name,
    method_kind = excluded.method_kind,
    method_updated_at = excluded.method_updated_at,
    method_sync_at = excluded.method_sync_at,
    method_deleted_at = excluded.method_deleted_at
    `,
    bindings,
  ).pipe(Effect.as(methods.map((m) => m.id)));
}
