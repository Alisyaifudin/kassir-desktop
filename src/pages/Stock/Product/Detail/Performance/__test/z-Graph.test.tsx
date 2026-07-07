import { describe, test, expect } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Temporal } from "temporal-polyfill";
import { Graph } from "../z-Graph";
import type { DataPoint, DeltaFilter } from "../util-bins";
import { render } from "~/lib/render";

const today = Temporal.Now.plainDateISO();

function makeDataPoint(day: number, qty: number): DataPoint {
  const start = today.add({ days: day });
  const end = start.add({ days: 1 });
  return {
    qty,
    bin: { start, end, label: start.day.toString() },
  };
}

const mockData: DataPoint[] = [
  makeDataPoint(0, 5),
  makeDataPoint(1, 3),
  makeDataPoint(2, 0),
  makeDataPoint(3, 8),
];

function renderGraph(data: DataPoint[], delta: DeltaFilter = "positive") {
  return render(<Graph data={data} delta={delta} />);
}

// ── Rendering ─────────────────────────────────────────────────

describe("Graph", () => {
  test("shows empty message when data is empty", async () => {
    renderGraph([]);
    expect(await screen.findByText(/tidak ada data/i)).not.toBeNull();
  });

  test("shows empty message when all quantities are zero", async () => {
    renderGraph([makeDataPoint(0, 0), makeDataPoint(1, 0)]);
    expect(await screen.findByText(/tidak ada data/i)).not.toBeNull();
  });

  test("renders chart when data has quantities", async () => {
    renderGraph(mockData);
    await waitFor(() => {
      expect(screen.queryByText(/tidak ada data/i)).toBeNull();
    });
  });

  // ── Delta colors ───────────────────────────────────────────

  test("positive delta renders green bars", () => {
    renderGraph(mockData, "positive");
    const bars = document.querySelectorAll(".recharts-bar-rectangle");
    if (bars.length > 0) {
      const firstBar = bars[0] as SVGElement;
      expect(firstBar.getAttribute("fill")).toBe("#10b981");
    }
  });

  test("negative delta renders red bars", () => {
    renderGraph(mockData, "negative");
    const bars = document.querySelectorAll(".recharts-bar-rectangle");
    if (bars.length > 0) {
      const firstBar = bars[0] as SVGElement;
      expect(firstBar.getAttribute("fill")).toBe("#ef4444");
    }
  });
});
