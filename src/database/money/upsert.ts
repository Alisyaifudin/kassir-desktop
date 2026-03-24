import { Effect } from "effect";
import { DB } from "../instance";

export function upsert({
  id,
  note,
  value,
  kindId,
  updatedAt,
  timestamp,
}: {
  id: string;
  note: string;
  value: number;
  kindId: string;
  timestamp: number;
  updatedAt: number;
}) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO money (money_id, timestamp, money_kind_id, money_value, money_note, 
       money_updated_at, money_sync_at) 
       VALUES ($1, $2, $3, $4, $5, $6,$7) ON CONFLICT (money_id) DO UPDATE SET
       timestamp = excluded.timestamp,
       money_kind_id = excluded.money_kind_id,
       money_value = excluded.money_value,
       money_note = excluded.money_note,
       money_updated_at = excluded.money_updated_at,
       money_sync_at = excluded.money_sync_at`,
      [id, timestamp, kindId, value, note, updatedAt, now],
    ),
  ).pipe(Effect.asVoid);
}
