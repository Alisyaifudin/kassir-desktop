import { describe, expect, test } from "bun:test";
import { Temporal } from "temporal-polyfill";
import { tz } from "./constants";
import {
  epochFromPlain,
  formatDate,
  formatTime,
  getDayName,
  monthNames,
  plainFromEpoch,
} from "./date";

/**
 * Every date on the screen and on paper goes through these: the history list,
 * the calendar, the picker and the receipt header. They read the machine's zone,
 * never UTC — a sale at 23:00 in Jakarta belongs to that day, not to tomorrow.
 * Each expectation is built in the same zone the formatter reads, so the suite
 * holds wherever it runs.
 */
const at = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) =>
  Temporal.ZonedDateTime.from({ timeZone: tz, year, month, day, hour, minute, second })
    .epochMilliseconds;

describe("formatDate", () => {
  test("the short form is the zero-padded numeric date the lists print", () => {
    expect(formatDate(at(2024, 3, 5))).toBe("05-03-2024");
    expect(formatDate(at(2024, 12, 31))).toBe("31-12-2024");
  });

  test("the long form names the month in Indonesian", () => {
    expect(formatDate(at(2024, 3, 5), "long")).toBe("5 Maret 2024");
    expect(formatDate(at(2024, 8, 17), "long")).toBe("17 Agustus 2024");
  });

  test("every month has a long name", () => {
    for (let month = 1; month <= 12; month += 1) {
      expect(typeof monthNames[month]).toBe("string");
      expect(monthNames[month]).not.toBe("");
      expect(formatDate(at(2024, month, 15), "long")).toBe(`15 ${monthNames[month]} 2024`);
    }
  });

  test("a record near midnight stays on its own local day", () => {
    // 23:30 local is the next day in UTC for western zones and the same day for
    // eastern ones; the formatter must answer with the wall clock either way.
    expect(formatDate(at(2024, 3, 5, 23, 30))).toBe("05-03-2024");
    expect(formatDate(at(2024, 3, 5, 0, 30))).toBe("05-03-2024");
  });
});

describe("formatTime", () => {
  test("the short form drops seconds, the long form keeps them", () => {
    expect(formatTime(at(2024, 3, 5, 7, 5, 9))).toBe("7:05");
    expect(formatTime(at(2024, 3, 5, 7, 5, 9), "long")).toBe("7:05:09");
  });

  test("midnight is 0:00, not 24:00 or 12:00", () => {
    expect(formatTime(at(2024, 3, 5), "long")).toBe("0:00:00");
  });
});

describe("getDayName", () => {
  test("names the Indonesian weekday", () => {
    // 2024-03-05 was a Tuesday and 2024-03-10 a Sunday, in every zone.
    expect(getDayName(at(2024, 3, 5, 12))).toBe("Selasa");
    expect(getDayName(at(2024, 3, 10, 12))).toBe("Minggu");
  });
});

describe("plainFromEpoch / epochFromPlain", () => {
  test("round-trips the wall clock the picker edits", () => {
    const plain = Temporal.PlainDateTime.from("2024-03-05T07:05:09");
    expect(plainFromEpoch(epochFromPlain(plain)).equals(plain)).toBe(true);
  });

  test("a picker reading prints back as the same date and time", () => {
    const epoch = epochFromPlain(Temporal.PlainDateTime.from("2024-03-05T23:30:00"));
    expect(formatDate(epoch, "long")).toBe("5 Maret 2024");
    expect(formatTime(epoch, "long")).toBe("23:30:00");
  });
});
