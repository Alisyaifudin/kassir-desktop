import { Effect } from "effect";
import { DB } from "../instance";

export function upsertOnePocketSync(
  {
    id,
    name,
    type,
    ordering,
    updatedAt,
  }: {
    id: string;
    name: string;
    type: DB.PocketType;
    ordering: number;
    updatedAt: number;
  },
  now: number,
) {
  return DB.execute(
    `INSERT INTO pockets (pocket_id, pocket_name, pocket_type, 
    pocket_ordering, pocket_updated_at, pocket_sync_at) 
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (pocket_id) DO UPDATE SET
    pocket_name = excluded.pocket_name,
    pocket_type = excluded.pocket_type,
    pocket_ordering = excluded.pocket_ordering,
    pocket_updated_at = excluded.pocket_updated_at,
    pocket_sync_at = excluded.pocket_sync_at`,
    [id, name, type, ordering, updatedAt, now],
  ).pipe(Effect.asVoid);
}
