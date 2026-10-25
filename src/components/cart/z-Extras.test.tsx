import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import Decimal from "decimal.js";
import type { Extra, ExtraPreset } from "./types";

/**
 * The "Tambahan" grid is the keyboard path every charge goes through, and its
 * bugs are invisible to the geometry unit tests: Enter inside the preset list
 * used to run twice (the list picked the highlighted preset, then the grid
 * appended `results[0]` from the same stale `extras` prop, so the first write
 * was lost) and the cashier got the wrong charge on the receipt.
 *
 * These tests dispatch real key events through the rendered grid and stub the
 * catalog at the service boundary (`useExtraPresets` is the Extra service's
 * projection), never at component internals.
 */
const presets: ExtraPreset[] = [
  { id: "e1", name: "Ongkos Kirim", kind: "number", value: 10_000, flag: 0 },
  { id: "e2", name: "Diskon Grosir", kind: "number", value: 2_000, flag: 0 },
];

mock.module("./use-extra-presets", () => ({ useExtraPresets: () => presets }));

const { Extras } = await import("./z-Extras");

function Harness({ writes }: { writes: Extra[][] }) {
  const [extras, setExtras] = useState<Extra[]>([]);
  return (
    <Extras
      mode="sale"
      extras={extras}
      subtotal={new Decimal(10_000)}
      focusSearch={0}
      onChange={(next) => {
        writes.push(next);
        setExtras(next);
      }}
    />
  );
}

function renderGrid() {
  const writes: Extra[][] = [];
  render(<Harness writes={writes} />);
  const search = screen.getByPlaceholderText("Cari biaya tambahan...") as HTMLInputElement;
  return { writes, search };
}

/** Type a query that matches both presets and hand focus to the preset list. */
function searchAndEnterList(search: HTMLInputElement) {
  fireEvent.change(search, { target: { value: "o" } });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  const list = document.activeElement as HTMLElement | null;
  expect(list).not.toBeNull();
  return list!;
}

describe("Tambahan grid keyboard", () => {
  beforeEach(() => {
    // Each test starts from a clean DOM; the module-level presets are read-only.
  });

  test("Enter adds the highlighted preset, not the first one", () => {
    const { writes, search } = renderGrid();
    const list = searchAndEnterList(search);

    // Walk to the second preset, then take it.
    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "Enter" });

    // One write, and it is the highlighted preset: the grid must not also
    // append `results[0]` from the same stale `extras` prop.
    expect(writes).toHaveLength(1);
    expect(writes[0]?.map((extra) => extra.name)).toEqual(["Diskon Grosir"]);
    expect(writes[0]?.[0]?.value).toBe(2_000);
  });

  test("Enter on the first preset still adds exactly one row", () => {
    const { writes, search } = renderGrid();
    const list = searchAndEnterList(search);

    fireEvent.keyDown(list, { key: "Enter" });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.map((extra) => extra.name)).toEqual(["Ongkos Kirim"]);
  });

  test("Enter in the search field itself adds the first match once", () => {
    const { writes, search } = renderGrid();

    fireEvent.change(search, { target: { value: "grosir" } });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(writes).toHaveLength(1);
    expect(writes[0]?.map((extra) => extra.name)).toEqual(["Diskon Grosir"]);
  });

  test("horizontal arrows stay in the preset list instead of moving the grid", () => {
    const { search } = renderGrid();
    const list = searchAndEnterList(search);

    fireEvent.keyDown(list, { key: "ArrowRight" });

    // Still in the list: the grid did not take the selection back.
    expect(document.activeElement).toBe(list);
  });

  test("a digit on the selected Nilai cell opens its editor with that digit", () => {
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: /Manual/ }));

    // Select the amount (the row's own `Nilai` cell), then type over it.
    fireEvent.click(screen.getByText("Nilai"));
    fireEvent.keyDown(screen.getByRole("grid", { name: "Biaya tambahan" }), { key: "5" });

    const cell = document.querySelector('[id$="-value"]') as HTMLElement;
    expect(cell.querySelector("input")?.value).toBe("Rp5");
  });

  test("clicking +manual adds one blank row to edit", () => {
    const { writes } = renderGrid();

    fireEvent.click(screen.getByRole("button", { name: /Manual/ }));

    expect(writes).toHaveLength(1);
    expect(writes[0]).toHaveLength(1);
    expect(writes[0]?.[0]?.name).toBe("");
  });
});

describe("Tambahan dual checkbox", () => {
  const DUAL = 0b1;

  /** Add the first preset through the search field and hand back the grid. */
  function addPreset() {
    const { writes, search } = renderGrid();
    fireEvent.change(search, { target: { value: "ongkos" } });
    fireEvent.keyDown(search, { key: "Enter" });
    const grid = screen.getByRole("grid", { name: "Biaya tambahan" });
    return { writes, grid };
  }

  /** Header → first extra row → name, value, kind, eff, dual. */
  function walkToDual(grid: HTMLElement) {
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(grid, { key: "ArrowRight" });
  }

  test("a preset arrives without the flag and Enter on the dual cell sets it", () => {
    const { writes, grid } = addPreset();
    walkToDual(grid);

    fireEvent.keyDown(grid, { key: "Enter" });

    const written = writes[writes.length - 1];
    expect(written?.[0]?.flag & DUAL).toBe(DUAL);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("data-state")).toBe("checked");

    fireEvent.keyDown(grid, { key: "Enter" });
    const cleared = writes[writes.length - 1];
    expect(cleared?.[0]?.flag & DUAL).toBe(0);
    expect(screen.getByRole("checkbox").getAttribute("data-state")).toBe("unchecked");
  });

  test("clicking the checkbox toggles the same flag the cell does", () => {
    const { writes } = addPreset();

    fireEvent.click(screen.getByRole("checkbox"));

    const written = writes[writes.length - 1];
    expect(written?.[0]?.flag & DUAL).toBe(DUAL);
    expect(screen.getByRole("checkbox").getAttribute("data-state")).toBe("checked");
  });
});
