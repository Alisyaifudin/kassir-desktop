import { Effect } from "effect";
import { TX } from "../instance";

export function kind(id: string, v: TX.ValueKind) {
  return TX.try((tx) =>
    tx.execute("UPDATE extras SET extra_kind = $1 WHERE extra_id = $2", [v, id]),
  ).pipe(Effect.asVoid);
}
