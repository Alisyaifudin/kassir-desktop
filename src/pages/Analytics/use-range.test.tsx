import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { DAY_MS, useRange, weekRange } from "./use-range";

/**
 * The period every analytics page reads, kept in the URL. Two rules are money: a
 * preset writes the bounds *and* names itself (so the button reads as pressed),
 * while a hand-picked range writes only the bounds (so no preset does). The
 * "year" preset also widens the bucket to a month, because 365 daily points is
 * not a chart.
 */
let search = "";
function Probe() {
  search = useLocation().search;
  return null;
}
function harness(entry = "/analytics") {
  return renderHook(() => useRange(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        {children}
      </MemoryRouter>
    ),
  });
}
const params = () => new URLSearchParams(search);

describe("useRange defaults", () => {
  test("no params means the last 30 days, daily, with no preset pressed", () => {
    const { from, to, interval, preset } = harness().result.current;
    const span = to - from;

    expect(preset).toBeNull();
    expect(interval).toBe("day");
    // 29 whole days back, plus today — a 30-day window inside DST slack.
    expect(span).toBeGreaterThanOrEqual(29 * DAY_MS);
    expect(span).toBeLessThanOrEqual(31 * DAY_MS);
  });

  test("a named preset and the bucket are read back", () => {
    const range = harness("/analytics?preset=month&interval=week").result.current;

    expect(range.preset).toBe("month");
    expect(range.interval).toBe("week");
  });

  test("an unknown preset is not a pressed button", () => {
    expect(harness("/analytics?preset=fortnight").result.current.preset).toBeNull();
  });

  test("a hand-written range wins over the default", () => {
    const range = harness("/analytics?from=1000&to=2000").result.current;
    expect([range.from, range.to]).toEqual([1000, 2000]);
  });

  test("bounds that do not parse fall back to the default window", () => {
    const { from, to } = harness("/analytics?from=abc&to=abc").result.current;
    expect(to).toBeGreaterThan(from);
    expect(to - from).toBeGreaterThanOrEqual(29 * DAY_MS);
  });
});

describe("presets and intervals", () => {
  test("a preset writes both bounds and names itself", () => {
    const { result } = harness();

    act(() => result.current.setPreset("7d"));

    expect(params().get("preset")).toBe("7d");
    expect(Number(params().get("to"))).toBeGreaterThan(Number(params().get("from")));
    const span = Number(params().get("to")) - Number(params().get("from"));
    expect(span).toBeGreaterThanOrEqual(7 * DAY_MS);
    expect(span).toBeLessThanOrEqual(9 * DAY_MS);
    expect(params().get("interval")).toBe("day");
  });

  test("the year preset buckets by month", () => {
    const { result } = harness();

    act(() => result.current.setPreset("year"));

    expect(params().get("preset")).toBe("year");
    expect(params().get("interval")).toBe("month");
  });

  test("changing the bucket keeps the bounds and the named preset", () => {
    const { result } = harness("/analytics?from=1000&to=2000&preset=90d");

    act(() => result.current.setInterval("week"));

    expect([params().get("from"), params().get("to")]).toEqual(["1000", "2000"]);
    expect(params().get("preset")).toBe("90d");
    expect(params().get("interval")).toBe("week");
  });

  test("a hand-picked range clears the preset button", () => {
    const { result } = harness("/analytics?preset=30d");

    act(() => result.current.setRange(5_000, 6_000));

    expect([params().get("from"), params().get("to")]).toEqual(["5000", "6000"]);
    expect(params().has("preset")).toBe(false);
    expect(params().get("interval")).toBe("day");
  });
});

describe("weekRange", () => {
  test("is Monday to next Monday, `to` exclusive", () => {
    // An instant in the middle of a week, in any zone.
    const wednesday = Date.UTC(2026, 2, 11, 12);
    const { from, to } = weekRange(wednesday);

    expect(to - from).toBe(7 * DAY_MS);
    expect(from).toBeLessThan(wednesday);
    expect(wednesday).toBeLessThan(to);
  });
});
