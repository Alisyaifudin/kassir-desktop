import { Effect } from "effect";
import { TX } from "../instance";

export function value(id: string, v: number) {
  return TX.try((tx) =>
    tx.execute("UPDATE extras SET extra_value = $1 WHERE extra_id = $2", [v, id]),
  ).pipe(Effect.asVoid);
}
