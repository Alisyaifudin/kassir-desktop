import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { MemoryRouter, useLocation } from "react-router";
import { tz } from "~/lib/constants";
import { useTime } from "./use-time";

/**
 * The selected day, kept in the URL. It drives every read on the Records screen,
 * and the write has to take `selected` with it: picking a new day while an old
 * record is open would otherwise leave the right pane showing a record from the
 * day we just left.
 */
let search = "";

function Probe() {
  search = useLocation().search;
  return null;
}

function harness(entry = "/records") {
  return renderHook(() => useTime(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}

const params = () => new URLSearchParams(search);
const startOf = (epoch: number) =>
  Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(tz).startOfDay().epochMilliseconds;

const DAY = Temporal.ZonedDateTime.from({ timeZone: tz, year: 2026, month: 3, day: 10 })
  .startOfDay()
  .epochMilliseconds;

describe("the chosen day", () => {
  test("no param means today, at local midnight", () => {
    const [day] = harness().result.current;
    const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay().epochMilliseconds;

    expect(day.time).toBe(today);
    expect(day.start).toBe(today);
    expect(day.end).toBe(startOf(today + 26 * 60 * 60 * 1000));
  });

  test("a valid param is read at local midnight, with its neighbours", () => {
    const [day] = harness(`/records?time=${DAY + 15 * 60 * 60 * 1000}`).result.current;

    expect(day.time).toBe(DAY);
    expect(day.start).toBe(DAY);
    expect(day.end).toBe(startOf(DAY + 25 * 60 * 60 * 1000));
    expect(day.yesterday).toBe(startOf(DAY - 2 * 60 * 60 * 1000));
    expect(day.tomorrow).toBe(day.end);
  });

  test("junk and out-of-range values fall back to today", () => {
    const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay().epochMilliseconds;

    expect(harness("/records?time=abc").result.current[0].time).toBe(today);
    expect(harness(`/records?time=${Number.MAX_SAFE_INTEGER}`).result.current[0].time).toBe(today);
    expect(harness("/records?time=-99999999999999").result.current[0].time).toBe(today);
  });
});

describe("picking a day", () => {
  test("writes the day and drops the open record with it", () => {
    const { result } = harness("/records?selected=r1");

    act(() => result.current[1](DAY));

    expect(params().get("time")).toBe(String(DAY));
    expect(params().has("selected")).toBe(false);
  });

  test("re-picking the same day keeps the open record", () => {
    const { result } = harness(`/records?time=${DAY}&selected=r1`);

    act(() => result.current[1](DAY));

    expect(params().get("selected")).toBe("r1");
  });

  test("other filters are left alone", () => {
    const { result } = harness("/records?query=kopi&mode=outcoming");

    act(() => result.current[1](DAY));

    expect(params().get("query")).toBe("kopi");
    expect(params().get("mode")).toBe("outcoming");
  });
});
