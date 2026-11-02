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
  showError,
  writes,
}: {
  initial: Temporal.PlainDateTime;
  max?: Temporal.PlainDateTime;
  showError?: boolean;
  writes: Temporal.PlainDateTime[];
}) {
  const [value, setValue] = useState(initial);
  return (
    <DateTime
      value={value}
      max={max}
      showError={showError}
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

function renderPicker(
  initial = START,
  max?: Temporal.PlainDateTime,
  showError = false,
) {
  const writes: Temporal.PlainDateTime[] = [];
  render(<Harness initial={initial} max={max} showError={showError} writes={writes} />);
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

describe("DateTime wall", () => {
  /** The row a column draws with this reading on it. */
  function rowOf(wheel: HTMLElement, text: string) {
    return Array.from(wheel.querySelectorAll("div")).find((row) => row.textContent === text);
  }

  test("a reading past the wall is drawn like any other, and can be taken", () => {
    const { writes, wheel } = renderPicker(START, START);
    const tomorrow = rowOf(wheel("hari"), "24");

    expect(tomorrow).toBeDefined();
    expect(tomorrow?.getAttribute("aria-disabled")).toBeNull();

    if (tomorrow !== undefined) fireEvent.click(tomorrow);
    expect(writes.at(-1)?.day).toBe(24);
  });

  test("the wheel rolls past the wall instead of stopping at it", () => {
    const { writes, wheel } = renderPicker(START, START);

    fireEvent.wheel(wheel("hari"), { deltaY: 120 });

    expect(writes.at(-1)?.day).toBe(24);
  });

  test("the columns keep their own bounds — the wall does not narrow them", () => {
    const { wheel } = renderPicker(START, START);

    expect(wheel("jam").getAttribute("aria-valuemax")).toBe("23");
    expect(wheel("menit").getAttribute("aria-valuemax")).toBe("59");
    expect(wheel("hari").getAttribute("aria-valuemax")).toBe("31");
  });

  test("a reading up to and including the wall is silent", () => {
    const { group, wheel } = renderPicker(START.with({ hour: 13 }), START, true);

    // 14:58:07 is the wall itself, and a wall includes its own reading.
    fireEvent.click(rowOf(wheel("jam"), "14") as HTMLElement);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(group.getAttribute("aria-invalid")).toBeNull();
  });

  test("nothing is said until the caller asks for it", () => {
    // `showError` is off: the picker is being used, not judged. Stepping past the
    // wall is silent — the refusal, if any, is the caller's to make.
    const { group, wheel } = renderPicker(START, START);

    fireEvent.click(rowOf(wheel("menit"), "59") as HTMLElement);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(group.getAttribute("aria-invalid")).toBeNull();
  });

  test("past the wall the complaint names it as <YYYY mmmm DD, HH.MM>", () => {
    const { group, wheel } = renderPicker(START, START, true);

    fireEvent.click(rowOf(wheel("menit"), "59") as HTMLElement);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe(
      "Tidak bisa memilih waktu di masa depan setelah 2026 Oktober 23, 14.58",
    );
    expect(group.getAttribute("aria-invalid")).toBe("true");
    // The group is described by the line, so a screen reader reads the reason
    // with the wheel rather than as a stray paragraph.
    expect(group.getAttribute("aria-describedby")).toBe(alert.getAttribute("id"));
  });

  test("the complaint clears when the reading comes back inside the wall", () => {
    const { group, wheel } = renderPicker(START, START, true);

    fireEvent.wheel(wheel("menit"), { deltaY: 120 });
    expect(screen.queryByRole("alert")).not.toBeNull();

    fireEvent.wheel(wheel("menit"), { deltaY: -120 });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(group.getAttribute("aria-invalid")).toBeNull();
  });

  test("typed digits are not clamped to the wall", () => {
    const { group, writes } = renderPicker(START, START, true);

    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowRight" }); // tahun
    for (const digit of ["2", "0", "2", "7"]) fireEvent.keyDown(group, { key: digit });

    expect(writes.at(-1)?.year).toBe(2027);
    expect(screen.queryByRole("alert")).not.toBeNull();
  });

  test("stepping back stays silent and allowed", () => {
    const { writes, group, wheel } = renderPicker(START, START);

    if (rowOf(wheel("hari"), "22") !== undefined) {
      fireEvent.click(rowOf(wheel("hari"), "22") as HTMLElement);
      expect(writes.at(-1)?.day).toBe(22);
    }

    fireEvent.keyDown(group, { key: "ArrowUp" });
    expect(writes.at(-1)?.day).toBe(21);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
