import { DB } from "../instance";
import { Effect } from "effect";

export function updateNote(id: string, note: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE records SET record_note = $1, record_updated_at = $2, record_sync_at = null
       WHERE record_id = $3`,
      [note, now, id],
    ),
  ).pipe(Effect.asVoid);
}
