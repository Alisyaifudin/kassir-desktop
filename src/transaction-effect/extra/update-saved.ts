import { Effect } from "effect";
import { TX } from "../instance";

export function saved(id: string, v: boolean) {
  return TX.try((tx) =>
    tx.execute("UPDATE extras SET extra_saved = $1 WHERE extra_id = $2", [v ? 1 : 0, id]),
  ).pipe(Effect.asVoid);
}
