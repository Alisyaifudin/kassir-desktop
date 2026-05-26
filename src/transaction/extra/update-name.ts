import { Effect } from "effect";
import { TX } from "../instance";

export function name(id: string, v: string) {
  return TX.try((tx) =>
    tx.execute("UPDATE extras SET extra_name = $1 WHERE extra_id = $2", [v, id]),
  ).pipe(Effect.asVoid);
}
