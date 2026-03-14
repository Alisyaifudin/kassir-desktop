import { DB } from "../instance";
import { Effect } from "effect";

export function updateNote(timestamp: number, note: string) {
  return DB.try((db) =>
    db.execute("UPDATE records SET record_note = $1 WHERE timestamp = $2", [note, timestamp]),
  ).pipe(Effect.asVoid);
}
