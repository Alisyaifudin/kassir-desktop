import { Effect } from "effect";
import { DB } from "../instance";

export function getMaxPocketOrdering() {
  return DB.select<{ max_order: number }[]>(
    `SELECT MAX(pocket_ordering) AS max_order FROM pocket`,
  ).pipe(Effect.map((res) => (res.length === 0 ? 0 : res[0].max_order)));
}
