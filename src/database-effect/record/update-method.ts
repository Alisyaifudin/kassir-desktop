import { Effect } from "effect";
import { DB } from "../instance";

export function updateMethod(timestamp: number, methodId: number) {
  return DB.try((db) =>
    db.execute("UPDATE records SET method_id = $1 WHERE timestamp = $2", [methodId, timestamp]),
  ).pipe(Effect.asVoid);
}
