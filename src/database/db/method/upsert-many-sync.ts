import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";
import { MethodServer } from "~/server/method/get";

export function upsertManyMethodsSync(
  methods: MethodServer[],
  now: number,
) {
  const mapped = methods.map((m) => ({
    id: m.id,
    name: m.name ?? undefined,
    kind: m.kind,
    updatedAt: m.updatedAt,
  }));
  return sqlx.method.sync.upsert.many(mapped, now).pipe(
    Effect.tap(() => {
      mapped.forEach(({ id, name, kind, updatedAt }) => {
        cache.update(id, { id, name, kind, updatedAt, syncAt: now });
      });
    }),
  );
}
