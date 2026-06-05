import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateMethodName(method: { id: string; name: string; label: string }) {
  const now = Date.now();
  return sqlx.method.update.one(method, now).pipe(
    Effect.tap(() => {
      cache.update(method.id, (prev) => ({ ...prev, name: method.name, label: method.label }));
    }),
  );
}
