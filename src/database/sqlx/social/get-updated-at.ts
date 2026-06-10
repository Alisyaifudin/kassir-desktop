import { DB } from "../instance";
import { Effect } from "effect";

export function getSocialsUpdatedAt(ids: string[]) {
  if (ids.length === 0) return Effect.succeed([]);
  const placeholders = ids.map(() => "?").join(", ");
  return DB.select<Pick<DB.Social, "social_id" | "social_updated_at">[]>(
    `SELECT social_id, social_updated_at FROM socials WHERE social_id IN (${placeholders})`,
    ids,
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({ id: r.social_id, updatedAt: r.social_updated_at })),
    ),
  );
}
