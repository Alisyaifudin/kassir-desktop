import { Effect } from "effect";
import { DB } from "../instance";

export function getAll() {
  return DB.try((db) => db.select<DB.MoneyKind[]>("SELECT * FROM money_kind")).pipe(
    Effect.flatMap((res) => {
      return Effect.all(
        res.map((r) =>
          DB.try((db) =>
            db.select<Pick<DB.Money, "timestamp" | "money_value">[]>(
              `SELECT timestamp, money_value FROM money WHERE money_kind_id = $1 ORDER BY timestamp DESC LIMIT 1`,
              [r.money_kind_id],
            ),
          ).pipe(
            Effect.map((rows) => {
              return {
                timestamp: rows.at(0)?.timestamp,
                value: rows.at(0)?.money_value,
                name: r.money_kind_name,
                id: r.money_kind_id,
                type: r.money_kind_type,
                updatedAt: r.money_kind_updated_at,
                syncAt: r.money_kind_sync_at,
              };
            }),
          ),
        ),
        {
          concurrency: "unbounded",
        },
      );
    }),
  );
}
