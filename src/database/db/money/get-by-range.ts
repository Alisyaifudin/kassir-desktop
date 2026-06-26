import Decimal from "decimal.js";
import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";

type Money = {
  timestamp: number;
  value: number;
  note: string;
  diff: number;
  id: string;
};

export function getMoneyByRange(pocketId: string, start: number, end: number) {
  return Effect.gen(function* () {
    const [last, money] = yield* Effect.all(
      [sqlx.money.get.last(pocketId, start), sqlx.money.get.byRange(pocketId, start, end)],
      { concurrency: "unbounded" },
    );
    return collectMoney(last, money);
  });
}

function collectMoney(
  last: number,
  money: Pick<DBNamespace.Money, "money_id" | "timestamp" | "money_value" | "money_note">[],
): Money[] {
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
