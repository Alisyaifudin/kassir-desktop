import { describe, expect, test } from "bun:test";
import { Temporal } from "temporal-polyfill";
import { daysOf, isPeriodKind, labelOf, rangeOf, step, type PeriodKind } from "./period";

/**
 * The report's periods, proved at the boundaries that actually break: a week that
 * straddles two months, a week that straddles two years, a leap day, a month that
 * starts on the 31st, and a zone with DST — because "a day is 24 hours" is the
 * assumption that quietly moves a takings figure to the wrong date.
 *
 * `Asia/Jakarta` is the shop's zone (no DST, so the plain cases read plainly);
 * `America/New_York` exists only to prove the DST cases.
 */
const SHOP = "Asia/Jakarta";
const DST = "America/New_York";

/** The instant `zone`'s clock reads `hour:00` on this date. */
function at(zone: string, year: number, month: number, day: number, hour = 12): number {
  return Temporal.ZonedDateTime.from({ timeZone: zone, year, month, day, hour }).epochMilliseconds;
}

/** Local midnight of this date, in `zone`. */
function midnight(zone: string, year: number, month: number, day: number): number {
  return Temporal.ZonedDateTime.from({ timeZone: zone, year, month, day }).epochMilliseconds;
}

/** `rangeOf` as the pair of local dates it covers — what the assertions read. */
function dates(kind: PeriodKind, anchor: number, zone = SHOP): string {
  const range = rangeOf(kind, anchor, zone);
  const from = Temporal.Instant.fromEpochMilliseconds(range.start).toZonedDateTimeISO(zone);
  const to = Temporal.Instant.fromEpochMilliseconds(range.end).toZonedDateTimeISO(zone);
  return `${from.toPlainDate()} → ${to.toPlainDate()}`;
}

describe("rangeOf — day", () => {
  test("an instant anywhere in the day lands on that day, half-open", () => {
    const range = rangeOf("day", at(SHOP, 2026, 3, 14, 23), SHOP);

    expect(range.start).toBe(midnight(SHOP, 2026, 3, 14));
    expect(range.end).toBe(midnight(SHOP, 2026, 3, 15));
  });

  test("it agrees with useTime, which is what /records hands the same day", () => {
    // Both derive local midnight from the same instant; a day that started at
    // different moments on the two screens would put a record in two places.
    const anchor = at(SHOP, 2026, 3, 14, 15);
    const viaTemporal = Temporal.Instant.fromEpochMilliseconds(anchor)
      .toZonedDateTimeISO(SHOP)
      .startOfDay().epochMilliseconds;

    expect(rangeOf("day", anchor, SHOP).start).toBe(viaTemporal);
  });
});

describe("rangeOf — week", () => {
  test("starts on Monday", () => {
    // 14 Mar 2026 is a Saturday, so the week it belongs to is 9–15 Mar.
    expect(dates("week", at(SHOP, 2026, 3, 14))).toBe("2026-03-09 → 2026-03-16");
  });

  test("a Monday is already the start of its own week", () => {
    expect(dates("week", at(SHOP, 2026, 3, 9))).toBe("2026-03-09 → 2026-03-16");
  });

  test("a Sunday closes the week rather than opening the next", () => {
    expect(dates("week", at(SHOP, 2026, 3, 15))).toBe("2026-03-09 → 2026-03-16");
  });

  test("a week that straddles two months", () => {
    expect(dates("week", at(SHOP, 2026, 2, 28))).toBe("2026-02-23 → 2026-03-02");
  });

  test("a week that straddles two years", () => {
    expect(dates("week", at(SHOP, 2026, 1, 1))).toBe("2025-12-29 → 2026-01-05");
  });
});

describe("rangeOf — month, quarter, year", () => {
  test("month ignores the day it is asked about", () => {
    expect(dates("month", at(SHOP, 2026, 3, 14))).toBe("2026-03-01 → 2026-04-01");
  });

  test("month from the 31st does not spill into the next month", () => {
    // The `{ month: 2 }`-on-the-31st trap: February has no 31st, and a naive
    // partial date would either throw or clamp to the wrong day.
    expect(dates("month", at(SHOP, 2026, 1, 31))).toBe("2026-01-01 → 2026-02-01");
    expect(dates("month", at(SHOP, 2026, 3, 31))).toBe("2026-03-01 → 2026-04-01");
  });

  test("February keeps its real length", () => {
    expect(dates("month", at(SHOP, 2026, 2, 14))).toBe("2026-02-01 → 2026-03-01");
    expect(dates("month", at(SHOP, 2028, 2, 29))).toBe("2028-02-01 → 2028-03-01");
  });

  test("quarters are the calendar's, not twelve-week blocks", () => {
    expect(dates("quarter", at(SHOP, 2026, 3, 14))).toBe("2026-01-01 → 2026-04-01");
    expect(dates("quarter", at(SHOP, 2026, 6, 30))).toBe("2026-04-01 → 2026-07-01");
    expect(dates("quarter", at(SHOP, 2026, 7, 1))).toBe("2026-07-01 → 2026-10-01");
  });

  test("the last quarter ends in the next year", () => {
    expect(dates("quarter", at(SHOP, 2026, 12, 31))).toBe("2026-10-01 → 2027-01-01");
    expect(dates("year", at(SHOP, 2026, 12, 31))).toBe("2026-01-01 → 2027-01-01");
  });
});

describe("step — the header's ‹ › buttons", () => {
  const cases: [PeriodKind, string][] = [
    ["day", "2026-03-15 → 2026-03-16"],
    ["week", "2026-03-16 → 2026-03-23"],
    ["month", "2026-04-01 → 2026-05-01"],
    ["quarter", "2026-04-01 → 2026-07-01"],
    ["year", "2027-01-01 → 2028-01-01"],
  ];

  test("+1 always lands on the next period of the same kind", () => {
    for (const [kind, expected] of cases) {
      const next = step(kind, at(SHOP, 2026, 3, 14), 1);
      expect(dates(kind, next)).toBe(expected);
    }
  });

  test("−1 is the inverse of +1, from any anchor inside the period", () => {
    for (const kind of ["day", "week", "month", "quarter", "year"] as const) {
      const anchor = at(SHOP, 2026, 3, 14, 9);
      expect(step(kind, step(kind, anchor, 1), -1)).toBe(step(kind, anchor, 0));
    }
  });

  test("0 normalises an anchor down to its own period start", () => {
    // This is what makes `rangeOf(kind, step(kind, …))` stable: the stepper's
    // answer is always a midnight on a boundary, never a time of day.
    for (const kind of ["day", "week", "month", "quarter", "year"] as const) {
      const start = step(kind, at(SHOP, 2026, 3, 14, 17), 0);
      expect(rangeOf(kind, start).start).toBe(start);
    }
  });

  test("a month step off the 31st does not drift, because it starts from the 1st", () => {
    const january = at(SHOP, 2026, 1, 31);
    expect(dates("month", step("month", january, 1))).toBe("2026-02-01 → 2026-03-01");
    expect(dates("month", step("month", step("month", january, 1), 1))).toBe(
      "2026-03-01 → 2026-04-01",
    );
  });
});

describe("daysOf — the day rail", () => {
  test("one entry per day, each a local midnight, oldest first", () => {
    const week = rangeOf("week", at(SHOP, 2026, 3, 14), SHOP);
    const days = daysOf(week, SHOP);

    expect(days).toHaveLength(7);
    expect(days).toEqual([
      midnight(SHOP, 2026, 3, 9),
      midnight(SHOP, 2026, 3, 10),
      midnight(SHOP, 2026, 3, 11),
      midnight(SHOP, 2026, 3, 12),
      midnight(SHOP, 2026, 3, 13),
      midnight(SHOP, 2026, 3, 14),
      midnight(SHOP, 2026, 3, 15),
    ]);
  });

  test("a day is one entry, and February has its own count", () => {
    expect(daysOf(rangeOf("day", at(SHOP, 2026, 3, 14), SHOP), SHOP)).toHaveLength(1);
    expect(daysOf(rangeOf("month", at(SHOP, 2026, 2, 14), SHOP), SHOP)).toHaveLength(28);
    expect(daysOf(rangeOf("month", at(SHOP, 2028, 2, 14), SHOP), SHOP)).toHaveLength(29);
    expect(daysOf(rangeOf("month", at(SHOP, 2026, 4, 14), SHOP), SHOP)).toHaveLength(30);
    expect(daysOf(rangeOf("month", at(SHOP, 2026, 1, 14), SHOP), SHOP)).toHaveLength(31);
  });

  test("a year counts its leap day", () => {
    expect(daysOf(rangeOf("year", at(SHOP, 2026, 6, 1), SHOP), SHOP)).toHaveLength(365);
    expect(daysOf(rangeOf("year", at(SHOP, 2028, 6, 1), SHOP), SHOP)).toHaveLength(366);
  });

  test("an empty range is no days, not one", () => {
    expect(daysOf({ start: 0, end: 0 }, SHOP)).toEqual([]);
  });
});

describe("DST — the reason the arithmetic is calendar-based", () => {
  // US DST 2026: forward on Sunday 8 March, back on Sunday 1 November.
  test("a 23-hour day is still one day", () => {
    const range = rangeOf("day", at(DST, 2026, 3, 8), DST);

    expect(range.end - range.start).toBe(23 * 60 * 60 * 1000);
    expect(daysOf(range, DST)).toHaveLength(1);
  });

  test("a 25-hour day is still one day", () => {
    const range = rangeOf("day", at(DST, 2026, 11, 1), DST);

    expect(range.end - range.start).toBe(25 * 60 * 60 * 1000);
    expect(daysOf(range, DST)).toHaveLength(1);
  });

  test("a week across the spring-forward is seven days, whichever way it is counted", () => {
    const week = rangeOf("week", at(DST, 2026, 3, 8), DST);
    const days = daysOf(week, DST);

    expect(days).toHaveLength(7);
    // Seven *calendar* days, so the span is an hour short of seven 24-hour days.
    expect(week.end - week.start).toBe(7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000);
    // Every entry is still a local midnight, which is what the rail renders.
    for (const day of days) {
      expect(Temporal.Instant.fromEpochMilliseconds(day).toZonedDateTimeISO(DST).hour).toBe(0);
    }
  });

  test("a month across a DST change keeps its calendar day count", () => {
    expect(daysOf(rangeOf("month", at(DST, 2026, 3, 5), DST), DST)).toHaveLength(31);
    expect(daysOf(rangeOf("month", at(DST, 2026, 11, 5), DST), DST)).toHaveLength(30);
  });
});

describe("labelOf — the header band", () => {
  test("a day reads in full", () => {
    expect(labelOf("day", rangeOf("day", at(SHOP, 2026, 3, 14), SHOP), SHOP)).toBe(
      "14 Maret 2026",
    );
  });

  test("a week inside one month prints the month once", () => {
    expect(labelOf("week", rangeOf("week", at(SHOP, 2026, 3, 14), SHOP), SHOP)).toBe(
      "9–15 Mar 2026",
    );
  });

  test("a week across two months names both", () => {
    expect(labelOf("week", rangeOf("week", at(SHOP, 2026, 2, 28), SHOP), SHOP)).toBe(
      "23 Feb – 1 Mar 2026",
    );
  });

  test("a week across two years names both", () => {
    expect(labelOf("week", rangeOf("week", at(SHOP, 2026, 1, 1), SHOP), SHOP)).toBe(
      "29 Des 2025 – 4 Jan 2026",
    );
  });

  test("month, quarter and year", () => {
    expect(labelOf("month", rangeOf("month", at(SHOP, 2026, 3, 14), SHOP), SHOP)).toBe("Mar 2026");
    expect(labelOf("quarter", rangeOf("quarter", at(SHOP, 2026, 3, 14), SHOP), SHOP)).toBe(
      "Kuartal 1 2026",
    );
    expect(labelOf("quarter", rangeOf("quarter", at(SHOP, 2026, 12, 1), SHOP), SHOP)).toBe(
      "Kuartal 4 2026",
    );
    expect(labelOf("year", rangeOf("year", at(SHOP, 2026, 3, 14), SHOP), SHOP)).toBe("2026");
  });

  test("a week's last day is the last day *in* it, not the exclusive end", () => {
    // "9–16 Mar" would read as eight days. A one-day week proves it at the seam.
    const range = { start: midnight(SHOP, 2026, 3, 9), end: midnight(SHOP, 2026, 3, 10) };
    expect(labelOf("week", range, SHOP)).toBe("9–9 Mar 2026");
  });
});

describe("isPeriodKind", () => {
  test("accepts exactly the five kinds", () => {
    for (const kind of ["day", "week", "month", "quarter", "year"]) {
      expect(isPeriodKind(kind)).toBe(true);
    }
    for (const junk of ["", "Minggu", "weeks", null, undefined, "DAY"]) {
      expect(isPeriodKind(junk)).toBe(false);
    }
  });
});
