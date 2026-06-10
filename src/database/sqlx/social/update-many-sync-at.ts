import { DB } from "../instance";

export function updateManySocialsSyncAt(ids: string[], now: number) {
  if (ids.length === 0) return DB.execute("");
  const placeholders = ids.map(() => "?").join(", ");
  return DB.execute(
    `UPDATE socials SET social_sync_at = ? WHERE social_id IN (${placeholders})`,
    [now, ...ids],
  );
}
