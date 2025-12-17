import Decimal from "decimal.js";
import { data, LoaderFunctionArgs } from "react-router";
import { Temporal } from "temporal-polyfill";
import { db } from "~/database";
import { Money } from "~/database/money/get-by-range";
import { DefaultError, err, integer, ok, Result } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams;
  const { start, end } = getInterval(search);
  const [errMsg, money] = await getMoney(start, end);
  if (errMsg !== null) {
    throw new Error(errMsg);
  }
  return data(money);
}

export type Loader = typeof loader;

export type Debt = {
  value: number;
  diff: string;
  timestamp: number;
};

function getInterval(search: URLSearchParams) {
  const now = Temporal.Now.instant().epochMilliseconds;
  const timestamp = integer.catch(now).parse(search.get("time"));
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(timestamp)
    .toZonedDateTimeISO(tz)
    .startOfDay();
  const start = Temporal.ZonedDateTime.from({
    year: date.year,
    month: date.month,
    day: 1,
    timeZone: tz,
  }).startOfDay();
  const end = start.add(Temporal.Duration.from({ months: 1 }));
  return { start: start.epochMilliseconds, end: end.epochMilliseconds };
}

export type MoneyData = {
  diff: {
    value: number;
    timestamp: number;
  }[];
  saving: {
    value: number;
    timestamp: number;
  }[];
  debt: {
    value: number;
    timestamp: number;
    diff: number;
  }[];
};
async function getMoney(start: number, end: number): Promise<Result<DefaultError, MoneyData>> {
  const [[errMoney, money], [errLast, last]] = await Promise.all([
    db.money.get.byRange(start, end),
    db.money.get.last(start, "debt"),
  ]);
  if (errMoney !== null) return err(errMoney);
  if (errLast !== null) return err(errLast);
  return ok({
    saving: money
      .filter((m) => m.kind === "saving")
      .map((m) => ({ timestamp: m.timestamp, value: m.value })),
    diff: money
      .filter((m) => m.kind === "diff")
      .map((m) => ({ timestamp: m.timestamp, value: m.value })),
    debt: collectMoney(money, last),
  });
}

function collectMoney(money: Money[], last: Money | null): MoneyData["debt"] {
  const filtered = money.filter((m) => m.kind === "debt");
  if (filtered.length === 0) return [];
  const n = filtered.length;
  const data: MoneyData["debt"] = [];
  for (let i = 0; i < filtered.length - 1; i++) {
    data.push({
      value: filtered[i].value,
      timestamp: filtered[i].timestamp,
      diff: new Decimal(filtered[i].value).minus(filtered[i + 1].value).toNumber(),
    });
  }
  let diff = filtered[n - 1].value;
  if (last !== null) {
    diff = new Decimal(diff).minus(last.value).toNumber();
  }
  data.push({
    value: filtered[n - 1].value,
    timestamp: filtered[n - 1].timestamp,
    diff,
  });
  return data;
}
