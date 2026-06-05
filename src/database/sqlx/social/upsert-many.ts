import { DB } from "../instance";
import { Effect } from "effect";

export function upsertManySocials(
  socials: { id: string; name: string; value: string; updatedAt: number }[],
  now: number,
) {
  let bindingIndex = 1;
  const placeholders = socials
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = socials.flatMap(({ id, name, value, updatedAt }) => [
    id,
    name,
    value,
    null,
    updatedAt,
    now,
  ]);
  return DB.execute(
    `INSERT INTO socials (social_id, social_name, social_value,
     social_deleted_at, social_updated_at, social_sync_at) 
     VALUES ${placeholders} ON CONFLICT (social_id) DO UPDATE SET
     social_name = excluded.social_name,
     social_value = excluded.social_value,
     social_deleted_at = excluded.social_deleted_at,
     social_updated_at = excluded.social_updated_at,
     social_sync_at = excluded.social_sync_at`,
    bindings,
  ).pipe(Effect.as(socials.map((social) => social.id)));
}
