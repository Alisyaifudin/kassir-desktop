import { DB } from "../instance";
import { Effect } from "effect";

export function getAllUnsyncSocials() {
  return DB.select<DBNamespace.Social[]>("SELECT * FROM socials WHERE social_sync_at IS NULL").pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.social_id,
        name: r.social_name,
        value: r.social_value,
        updatedAt: r.social_updated_at,
        syncAt: r.social_sync_at ?? undefined,
      })),
    ),
  );
}

export function getAllUnsync() {
  return getAllUnsyncSocials().pipe(Effect.map((exist) => ({ exist, deleted: [] })));
}
