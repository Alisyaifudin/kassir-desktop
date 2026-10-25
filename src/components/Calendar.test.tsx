import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { Calendar } from "./Calendar";

/**
 * `Calendar` returns a start-of-day instant for every day click. Two of its
 * callers (`z-PaidAt`, `z-CreditAt`) use it to edit a persisted timestamp, so a
 * day pick used to rewrite the sale's clock to 00:00 — re-sorting the day list,
 * changing `record.date` and printing 00:00 on a reprint, with no way to put the
 * time back (the picker has no time control). `granularity="instant"` keeps the
 * clock; the default `"day"` still snaps to midnight for date filters.
 */
const tz = Temporal.Now.timeZoneId();

function instantOf(year: number, month: number, day: number, hour: number, minute: number) {
  return Temporal.ZonedDateTime.from({
    timeZone: tz,
    year,
    month,
    day,
    hour,
    minute,
  }).epochMilliseconds;
}

function fieldsOf(epoch: number) {
  const zoned = Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(tz);
  return {
    year: zoned.year,
    month: zoned.month,
    day: zoned.day,
    hour: zoned.hour,
    minute: zoned.minute,
  };
}

function openCalendar(props: { time: number; granularity?: "day" | "instant" }) {
  const picked: number[] = [];
  render(
    <Calendar {...props} setTime={(time) => picked.push(time)}>
      <p>pilih tanggal</p>
    </Calendar>,
  );
  fireEvent.click(screen.getByRole("button", { name: /pilih tanggal/ }));
  return picked;
}

describe("Calendar", () => {
  test("a day pick keeps the hour and minute when editing an instant", () => {
    const time = instantOf(2026, 3, 10, 14, 32);
    const picked = openCalendar({ time, granularity: "instant" });

    // The month grid repeats the neighbouring months' days, so "5" appears
    // twice; the current month's cell comes first.
    fireEvent.click(screen.getAllByRole("button", { name: "5" })[0]);

    expect(picked).toHaveLength(1);
    expect(fieldsOf(picked[0])).toEqual({
      year: 2026,
      month: 3,
      day: 5,
      hour: 14,
      minute: 32,
    });
  });

  test("a day filter still snaps to local midnight", () => {
    const time = instantOf(2026, 3, 10, 0, 0);
    const picked = openCalendar({ time });

    // The month grid repeats the neighbouring months' days, so "5" appears
    // twice; the current month's cell comes first.
    fireEvent.click(screen.getAllByRole("button", { name: "5" })[0]);

    expect(picked).toHaveLength(1);
    expect(fieldsOf(picked[0])).toEqual({ year: 2026, month: 3, day: 5, hour: 0, minute: 0 });
  });

  test('"Hari Ini" means today at the same time of day', () => {
    const time = instantOf(2020, 1, 10, 9, 15);
    const picked = openCalendar({ time, granularity: "instant" });

    fireEvent.click(screen.getByRole("button", { name: "Hari Ini" }));

    const result = fieldsOf(picked[0]);
    const today = Temporal.Now.instant().toZonedDateTimeISO(tz);
    expect(result.year).toBe(today.year);
    expect(result.month).toBe(today.month);
    expect(result.day).toBe(today.day);
    expect(result.hour).toBe(9);
    expect(result.minute).toBe(15);
  });
});
