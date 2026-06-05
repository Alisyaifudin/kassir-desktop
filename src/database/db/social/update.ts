import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateSocial(id: string, name: string, value: string) {
  const now = Date.now();
  return sqlx.social.update.one({ id, name, value }, now).pipe(
    Effect.tap(() => {
      cache.update(id, { id, name, value, updatedAt: now });
    }),
  );
}
