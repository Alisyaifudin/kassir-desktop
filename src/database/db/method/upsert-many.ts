import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";

export function upsert(
  methods: {
    id: string;
    name?: string;
    label?: string;
    kind: DB.MethodEnum;
    updatedAt: number;
  }[],
  now: number,
) {
  return sqlx.method.upsert.many(methods, now).pipe(
    Effect.tap(() => {
      methods.forEach(({ id, kind, updatedAt, label, name }) =>
        cache.update(id, { id, name, label, kind, updatedAt, syncAt: now }),
      );
    }),
  );
}
