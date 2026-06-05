import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getAllSocials() {
  const socials = cache.all();
  if (socials !== null) return Effect.succeed(socials);
  return sqlx.social.get.all().pipe(Effect.tap((items) => cache.set(items)));
}
