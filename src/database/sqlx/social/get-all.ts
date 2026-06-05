import { DB } from "../instance";
import { Effect } from "effect";

export function getAllSocials() {
  return DB.select<DB.Social[]>("SELECT * FROM socials WHERE social_deleted_at IS NULL").pipe(
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
