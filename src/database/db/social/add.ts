import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function addNewSocial(name: string, value: string) {
  const now = Date.now();
  return sqlx.social.add.one(name, value, now).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, value, updatedAt: now });
    }),
  );
}
