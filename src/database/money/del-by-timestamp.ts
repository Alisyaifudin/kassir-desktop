import { Effect } from "effect";
import { DB } from "../instance";

export function delByTimestamp(timestamp: number) {
  return DB.try((db) => db.execute("DELETE FROM money WHERE timestamp = $1", [timestamp])).pipe(
    Effect.asVoid,
  );
}
