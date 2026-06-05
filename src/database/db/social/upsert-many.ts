import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";

export function upsertManySocials(
  socials: { id: string; name: string; value: string; updatedAt: number }[],
  now: number,
) {
  return sqlx.social.upsert.many(socials, now).pipe(
    Effect.tap(() => {
      socials.forEach(({ id, name, value, updatedAt }) => {
        cache.update(id, { id, name, value, updatedAt, syncAt: now });
      });
    }),
  );
}
