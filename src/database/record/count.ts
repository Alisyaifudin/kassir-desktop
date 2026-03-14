import { Effect } from "effect";
import { DB } from "../instance";

export function count(start: number, end: number) {
  return DB.try((db) =>
    db.select<{ count: number; record_mode: DB.Mode }[]>(
      `SELECT COUNT(*) AS count, record_mode FROM records WHERE timestamp BETWEEN $1 AND $2 GROUP BY record_mode`,
      [start, end],
    ),
  ).pipe(
    Effect.map((r) => {
      const sell = r.find((item) => item.record_mode === "sell")?.count ?? 0;
      const buy = r.find((item) => item.record_mode === "buy")?.count ?? 0;
      return { sell, buy };
    }),
  );
}
