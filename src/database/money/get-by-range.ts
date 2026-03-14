import { DB } from "../instance";
import { Effect } from "effect";

export type Money = {
  timestamp: number;
  value: number;
  kind: DB.MoneyEnum;
  note: string;
};

export function getByRange(start: number, end: number) {
  return Effect.gen(function* () {
    const raw = yield* DB.try((db) =>
      db.select<DB.Money[]>(
        "SELECT * FROM money WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC",
        [start, end],
      ),
    );
    const money: Money[] = raw.map((r) => ({
      timestamp: r.timestamp,
      value: r.money_value,
      kind: r.money_kind,
      note: r.note,
    }));
    return money;
  });
}
