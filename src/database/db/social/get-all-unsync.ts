import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getAllUnsyncSocials() {
  const socials = cache.all();
  if (socials !== null) return Effect.succeed(socials.filter((s) => s.syncAt === undefined));
  return sqlx.social.get.unsync();
}
