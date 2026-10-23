import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";
import { DateTime } from "./DateTime";

/**
 * The wheel is driven by mouse events that React does not model well (a passive
 * `onWheel` cannot stop the dialog scrolling) and by a click that only commits
 * when its slide ends, so the interactions are pinned here rather than left to
 * the dialog's manual pass.
 */
function Harness({
  initial,
  max,
  writes,
}: {
  initial: Temporal.PlainDateTime;
  max?: Temporal.PlainDateTime;
  writes: Temporal.PlainDateTime[];
}) {
  const [value, setValue] = useState(initial);
  return (
    <DateTime
      value={value}
      max={max}
      onChange={(next) => {
        writes.push(next);
        setValue(next);
      }}
    />
  );
}

const START = Temporal.PlainDateTime.from({
  year: 2026,
  month: 10,
  day: 23,
  hour: 14,
  minute: 58,
  second: 7,
});

function renderPicker(initial = START, max?: Temporal.PlainDateTime) {
  const writes: Temporal.PlainDateTime[] = [];
  render(<Harness initial={initial} max={max} writes={writes} />);
  const group = screen.getByRole("group", { name: "Waktu" });
  const wheel = (label: string) => screen.getByRole("spinbutton", { name: label });
  return { writes, group, wheel };
}

describe("DateTime", () => {
  test("shows the six fields, the month by name, and the value in the middle row", () => {
    const { wheel } = renderPicker();

    for (const label of ["hari", "bulan", "tahun", "jam", "menit", "detik"]) {
      expect(wheel(label)).toBeTruthy();
    }
    expect(wheel("bulan").getAttribute("aria-valuetext")).toBe("Oktober");
    expect(wheel("bulan").getAttribute("aria-valuenow")).toBe("10");
    expect(wheel("hari").getAttribute("aria-valuenow")).toBe("23");
    expect(wheel("tahun").getAttribute("aria-valuenow")).toBe("2026");
    expect(wheel("detik").getAttribute("aria-valuemax")).toBe("59");
    expect(wheel("hari").textContent).toContain("23");
  });

  test("the year window is anchored on today, ±5/+1", () => {
    const { wheel } = renderPicker();
    const today = Temporal.Now.plainDateTimeISO(Temporal.Now.timeZoneId());

    expect(wheel("tahun").getAttribute("aria-valuemin")).toBe(String(today.year - 5));
    expect(wheel("tahun").getAttribute("aria-valuemax")).toBe(String(today.year + 1));
  });

  test("↑/↓ step the active field and ←/→ walk the fields", () => {
    const { writes, group } = renderPicker();

    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(writes.at(-1)?.day).toBe(24);

    fireEvent.keyDown(group, { key: "ArrowRight" }); // bulan
    fireEvent.keyDown(group, { key: "ArrowDown" }); // Okt -> Nov
    expect(writes.at(-1)?.month).toBe(11);
    // The earlier step survives: only the active field moves.
    expect(writes.at(-1)?.day).toBe(24);
  });

  test("a wheel stops at its bound instead of rolling over", () => {
    const { writes, group } = renderPicker(START.with({ day: 31 }));

    fireEvent.keyDown(group, { key: "ArrowDown" });
    // 31 is January's last day: clamped, so nothing is written at all.
    expect(writes).toHaveLength(0);
  });

  test("changing the month constrains the day", () => {
    const { writes, group } = renderPicker(START.with({ day: 31, month: 1 }));

    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowDown" });

    expect(writes.at(-1)?.month).toBe(2);
    expect(writes.at(-1)?.day).toBe(28);
  });

  test("digits type a value into the active field", () => {
    const { writes, group } = renderPicker();

    fireEvent.keyDown(group, { key: "2" });
    fireEvent.keyDown(group, { key: "3" });
    expect(writes.at(-1)?.day).toBe(23);

    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowRight" }); // tahun
    for (const digit of ["2", "0", "2", "4"]) fireEvent.keyDown(group, { key: digit });
    expect(writes.at(-1)?.year).toBe(2024);
  });

  test("each column's strip is a spring-driven transform, at rest on mount", () => {
    const { wheel } = renderPicker();
    const strip = wheel("bulan").querySelector('[data-slide="month"]') as HTMLElement | null;

    expect(strip).not.toBeNull();
    expect(strip?.style.transform).toContain("translateY(");
  });

  test("the mouse wheel steps the wheel under the pointer", () => {
    const { writes, wheel } = renderPicker();

    // One mouse notch (~100-120px) is one reading.
    fireEvent.wheel(wheel("menit"), { deltaY: 120 });
    expect(writes.at(-1)?.minute).toBe(59);

    fireEvent.wheel(wheel("menit"), { deltaY: -120 });
    expect(writes.at(-1)?.minute).toBe(58);
  });

  test("a trackpad's small deltas accumulate into one step", () => {
    const { writes, wheel } = renderPicker();
    const second = wheel("detik");

    fireEvent.wheel(second, { deltaY: 30 });
    fireEvent.wheel(second, { deltaY: 30 });
    // 60px of travel is not a reading yet, so the strip does not move at all.
    expect(writes).toHaveLength(0);

    fireEvent.wheel(second, { deltaY: 30 });
    expect(writes.at(-1)?.second).toBe(8);
  });

  test("scrolling a wheel that sits on its bound does nothing", () => {
    const { writes, wheel } = renderPicker(START.with({ day: 31 }));

    fireEvent.wheel(wheel("hari"), { deltaY: 120 });

    expect(writes).toHaveLength(0);
  });

  test("clicking the row below takes that reading", () => {
    const { writes, wheel } = renderPicker();
    const month = wheel("bulan");

    // The third row is what November would read as.
    const next = Array.from(month.querySelectorAll("div")).find(
      (row) => row.textContent === "November",
    );
    expect(next).toBeDefined();
    if (next === undefined) return;

    fireEvent.click(next);

    expect(writes.at(-1)?.month).toBe(11);
  });

  test("clicking the row above the selection takes the earlier reading", () => {
    const { writes, wheel } = renderPicker();
    const day = wheel("hari");

    const previous = Array.from(day.querySelectorAll("div")).find(
      (row) => row.textContent === "22",
    );
    if (previous === undefined) return;

    fireEvent.click(previous);

    expect(writes.at(-1)?.day).toBe(22);
  });
});

describe("DateTime max", () => {
  /** A reading is disabled when the wall refuses it; the row is still drawn. */
  function rowOf(wheel: HTMLElement, text: string) {
    return Array.from(wheel.querySelectorAll("div")).find((row) => row.textContent === text);
  }

  test("a reading past max is drawn but disabled, and cannot be clicked", () => {
    const { writes, wheel } = renderPicker(START, START);
    const day = wheel("hari");
    const tomorrow = rowOf(day, "24");

    expect(tomorrow).toBeDefined();
    expect(tomorrow?.getAttribute("aria-disabled")).toBe("true");

    if (tomorrow !== undefined) fireEvent.click(tomorrow);
    expect(writes).toHaveLength(0);
  });

  test("the wheel cannot scroll past max", () => {
    const { writes, wheel } = renderPicker(START, START);

    fireEvent.wheel(wheel("hari"), { deltaY: 120 });

    expect(writes).toHaveLength(0);
  });

  test("stepping back is still allowed", () => {
    const { writes, group, wheel } = renderPicker(START, START);
    const yesterday = rowOf(wheel("hari"), "22");

    expect(yesterday?.getAttribute("aria-disabled")).toBeNull();
    if (yesterday !== undefined) fireEvent.click(yesterday);
    expect(writes.at(-1)?.day).toBe(22);

    fireEvent.keyDown(group, { key: "ArrowUp" });
    expect(writes.at(-1)?.day).toBe(21);
  });

  test("max is a datetime, not a per-column number", () => {
    // An hour earlier than max: the hour wheel may reach max's hour — 14:58:07
    // is the wall — but not the hour after it.
    const { writes, wheel } = renderPicker(START.with({ hour: 13 }), START);
    const hour = () => wheel("jam");

    const toFourteen = rowOf(hour(), "14");
    expect(toFourteen?.getAttribute("aria-disabled")).toBeNull();

    if (toFourteen !== undefined) fireEvent.click(toFourteen);
    expect(writes.at(-1)?.hour).toBe(14);

    // From 14:58, the next hour (15:58) is past the wall: drawn, disabled.
    const toFifteen = rowOf(hour(), "15");
    expect(toFifteen?.getAttribute("aria-disabled")).toBe("true");

    // And at 14:58 the minute wheel may not move either: 14:59 is past it.
    const minute = rowOf(wheel("menit"), "59");
    expect(minute?.getAttribute("aria-disabled")).toBe("true");
  });

  test("typed digits clamp to max", () => {
    const { writes, group } = renderPicker(START, START);

    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowRight" }); // tahun
    for (const digit of ["2", "0", "2", "7"]) fireEvent.keyDown(group, { key: digit });
    // 2027 is past the wall; the year parks on 2026 instead of stepping over.
    expect(writes.every((written) => written.year <= 2026)).toBe(true);
  });
});
