import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteSocialById(id: string) {
  const now = Date.now();
  return sqlx.social.delete.byId(id, now).pipe(Effect.tap(() => cache.delete(id)));
}
