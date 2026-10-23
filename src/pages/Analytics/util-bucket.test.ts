import { describe, expect, test } from "bun:test";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import type { DailyStat } from "~/services/analytics";
import { bucketise } from "./util-bucket";

function day(days: number): { start: number; key: string } {
  const start = Temporal.ZonedDateTime.from({
    timeZone: tz,
    year: 2026,
    month: 1,
    day: 1,
  })
    .startOfDay()
    .add({ days }).epochMilliseconds;
  const key = Temporal.Instant.fromEpochMilliseconds(start)
    .toZonedDateTimeISO(tz)
    .toPlainDate()
    .toString();
  return { start, key };
}

const sale = (key: string, total: number, count = 1): DailyStat => ({
  day: key,
  mode: "incoming",
  count,
  total,
  unpaid: 0,
  creditCount: 0,
});

const buy = (key: string, total: number): DailyStat => ({
  day: key,
  mode: "outcoming",
  count: 1,
  total,
  unpaid: 0,
  creditCount: 0,
});

describe("bucketise", () => {
  test("rolls days into one bucket per day and fills the gaps", () => {
    const d0 = day(0);
    const d1 = day(1);
    const d2 = day(2);
    const from = d0.start;
    const to = day(3).start; // exclusive

    const buckets = bucketise(
      [sale(d0.key, 100), buy(d0.key, 40), sale(d2.key, 60)],
      [{ day: d0.key, margin: 25, costed: 2 }],
      from,
      to,
      "day",
    );

    expect(buckets.map((b) => b.label)).toHaveLength(3);
    expect(buckets.map((b) => b.omzet)).toEqual([100, 0, 60]);
    expect(buckets.map((b) => b.pengeluaran)).toEqual([40, 0, 0]);
    expect(buckets.map((b) => b.net)).toEqual([60, 0, 60]);
    expect(buckets.map((b) => b.margin)).toEqual([25, 0, 0]);
    // the gap day exists; it is not skipped
    expect(buckets[1]).toMatchObject({ omzet: 0, count: 0, margin: 0 });
    void d1;
  });

  test("rolls days into a single month bucket", () => {
    const d0 = day(0);
    const from = d0.start;
    const to = day(31).start;
    const buckets = bucketise(
      [sale(day(0).key, 100), sale(day(20).key, 50)],
      [{ day: day(20).key, margin: 10, costed: 1 }],
      from,
      to,
      "month",
    );

    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ omzet: 150, margin: 10, costed: 1, net: 150 });
  });
});
