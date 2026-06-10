import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getSocialsUpdatedAt(ids: string[]) {
  const socials = cache.all();
  if (socials !== null) {
    const set = new Set(ids);
    return Effect.succeed(
      new Map(
        socials.flatMap((s) =>
          set.has(s.id) ? [[s.id, s.updatedAt]] : [],
        ),
      ),
    );
  }
  return sqlx.social.get
    .updatedAt(ids)
    .pipe(Effect.map((res) => new Map(res.map((r) => [r.id, r.updatedAt]))));
}
