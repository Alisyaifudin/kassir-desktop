import Decimal from "decimal.js";
import { DB } from "../instance";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";
import { getLast } from "./get-last";

export type Money = {
  timestamp: number;
  value: number;
  note: string;
  diff: number;
  id: string;
};

export type MoneyKind = {
  name: string;
  type: DB.MoneyType;
  id: string;
};

export function getByRange(kindId: string, start: number, end: number) {
  return Effect.gen(function* () {
    const [last, money, kind] = yield* Effect.all(
      [
        getLast(start, kindId),
        DB.try((db) =>
          db.select<Omit<DB.Money, "money_kind">[]>(
            `SELECT money_id, timestamp, money_value, money_note FROM money WHERE timestamp BETWEEN $1 AND $2 AND money_kind_id = ?3 
             ORDER BY timestamp DESC`,
            [start, end, kindId],
          ),
        ),
        DB.try((db) =>
          db.select<DB.MoneyKind[]>("SELECT * FROM money_kind WHERE money_kind_id = $1", [kindId]),
        ).pipe(
          Effect.flatMap((res) => {
            if (res.length === 0) return NotFound.fail("Kantong tidak ditemukan");
            return Effect.succeed({
              name: res[0].money_kind_name,
              type: res[0].money_kind_type,
              id: res[0].money_kind_id,
            });
          }),
        ),
      ],
      { concurrency: "unbounded" },
    );

    return { money: collectMoney(money, last), kind };
  });
}

function collectMoney(money: Omit<DB.Money, "money_kind">[], last: number): Money[] {
  const n = money.length;
  const data: Money[] = [];
  if (n === 0) return data;
  for (let i = 0; i < n - 1; i++) {
    data.push({
      value: money[i].money_value,
      timestamp: money[i].timestamp,
      diff: new Decimal(money[i].money_value).minus(money[i + 1].money_value).toNumber(),
      note: money[i].money_note,
      id: money[i].money_id,
    });
  }
  const lastDiff = new Decimal(money[n - 1].money_value).minus(last).toNumber();
  data.push({
    value: money[n - 1].money_value,
    timestamp: money[n - 1].timestamp,
    diff: lastDiff,
    note: money[n - 1].money_note,
    id: money[n - 1].money_id,
  });
  return data;
}
