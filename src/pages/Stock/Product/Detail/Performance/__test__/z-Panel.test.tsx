import { describe, test, expect, mock } from "bun:test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Temporal } from "temporal-polyfill";
import { Panel } from "../z-Panel";
import type { Preset } from "../use-range";
import { render } from "~/lib/render";

const noop = () => {};

function renderPanel(opts?: {
  preset?: Preset;
  onPresetChange?: (p: Preset) => void;
}) {
  return render(
    <Panel
      size="big"
      preset={opts?.preset ?? "30d"}
      start={Date.now() - 30 * 86400000}
      end={Date.now()}
      tz={Temporal.Now.timeZoneId()}
      onPresetChange={opts?.onPresetChange ?? noop}
      onCustomRangeChange={() => {}}
    />,
  );
}

// ── Rendering ─────────────────────────────────────────────────

describe("Panel", () => {
  test("renders all preset buttons", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "30 Hari" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Tahun Ini" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "1 Tahun" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Sepanjang Masa" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Kustom" })).not.toBeNull();
  });

  test("renders ModeSelect radio buttons", () => {
    renderPanel();
    expect(screen.getByLabelText("Penambahan")).not.toBeNull();
    expect(screen.getByLabelText("Pengurangan")).not.toBeNull();
  });

  // ── Preset clicks ──────────────────────────────────────────

  test("calls onPresetChange when a different preset is clicked", async () => {
    const user = userEvent.setup();
    const onPresetChange = mock((_p: Preset) => {});

    renderPanel({ preset: "30d", onPresetChange });

    await user.click(screen.getByRole("button", { name: "1 Tahun" }));
    expect(onPresetChange).toHaveBeenCalledWith("1y");
  });

  // ── Custom preset ──────────────────────────────────────────

  test("shows DateRangePicker when preset is custom", () => {
    renderPanel({ preset: "custom" });
    // DateRangePicker renders a button with CalendarDays icon
    const buttons = screen.getAllByRole("button");
    const hasCalendarTrigger = buttons.some(
      (b) => b.innerHTML.includes("calendar-days") || b.querySelector("svg") !== null,
    );
    expect(hasCalendarTrigger).toBe(true);
  });
});
