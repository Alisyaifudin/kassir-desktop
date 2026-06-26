import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function upsertManyMethodsSync(
  methods: {
    id: string;
    name?: string;
    kind: DBNamespace.MethodEnum;
    updatedAt: number;
  }[],
  now: number,
) {
  return sqlx.method.sync.upsert.many(methods, now).pipe(
    Effect.tap(() => {
      methods.forEach(({ id, name, kind, updatedAt }) => {
        cache.update(id, { id, name, kind, updatedAt, syncAt: now });
      });
    }),
  );
}
