import Decimal from "decimal.js";
import { Temporal } from "temporal-polyfill";
import { Database } from "~/database/old";
import { LoaderArgs, numeric } from "~/lib/utils";
import { getContext } from "~/middleware/global";

export async function loader({ context, request }: LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams;
  const { start, end } = getInterval(search);
  const { db, store } = getContext(context);
  const [errMsg, money] = await db.money.get.byRange(start, end);
  if (errMsg !== null) {
    throw new Error(errMsg);
  }
  const saving = money.filter((m) => m.kind === "saving");
  const diff = money.filter((m) => m.kind === "diff");
  const debtRaw = money.filter((m) => m.kind === "debt");
  const lastDebt = await getLastDebt(start, debtRaw.length, db);
  debtRaw.push(lastDebt);
  const debt = debtRaw
    .slice(0, -1)
    .map((m, i) => ({
      diff: new Decimal(m.value)
        .sub(debtRaw[i + 1].value)
        .toNumber()
        .toLocaleString("id-ID"),
      ...m,
    }))
    .filter((m) => m.timestamp > start);
  const size = await store.size();
  return { size, money: { diff, saving, debt } };
}

export type Loader = typeof loader;

export type Debt = {
  value: number;
  diff: string;
  timestamp: number;
};

export type Money = {
  value: number;
  timestamp: number;
};

function getInterval(search: URLSearchParams) {
  const now = Temporal.Now.instant().epochMilliseconds;
  const timestamp = numeric.catch(now).parse(search.get("time"));
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

async function getLastDebt(start: number, count: number, db: Database): Promise<DB.Money> {
  const [errCount, dbCount] = await db.money.debt.count();
  if (errCount !== null) {
    throw new Error(errCount);
  }
  // it is imposible for count > dbCount. but just in case
  if (count >= dbCount) {
    return { kind: "debt", timestamp: 0, value: 0 };
  }
  const tz = Temporal.Now.timeZoneId();
  let tEnd = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
  let tStart = () => tEnd.subtract(Temporal.Duration.from({ months: 1 }));
  while (true) {
    // fetch until found!
    const [errMsg, money] = await db.money.debt.getByRange(
      tStart().epochMilliseconds,
      tEnd.epochMilliseconds,
    );
    if (errMsg !== null) {
      throw new Error(errMsg);
    }
    if (money.length > 0) {
      return money[0];
    }
    tEnd = tStart();
  }
}
