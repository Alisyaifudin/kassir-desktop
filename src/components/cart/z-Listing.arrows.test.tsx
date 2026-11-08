import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { Line } from "./types";

/**
 * Leaving an editor with the arrow keys, and showing a decimal price.
 *
 * The cursor inside a cell's editor is the browser's own — the arrows move it.
 * Once it reaches the edge of the value, the next press commits, closes the
 * editor and moves the cell selection: the row is walked without Enter. Up and
 * down always leave the editor (there is no "caret line" in a single-line
 * field), and down off the last row hands the keyboard to the settle strip.
 *
 * A record's `fix` is its decimal places. A price typed as `12.000,35` on a
 * `fix = 4` record stays `12.000,35` in the cell instead of being rounded to
 * whole rupiah the moment the editor closes.
 */
const listing: Listing = {
  id: "l1",
  productId: "p1",
  name: "Kopi Susu",
  price: 10_000,
  unit: 1,
  kind: "retail",
  code: "899123",
  cover: null,
  stock: 10,
  productName: "Kopi",
  altNames: [],
};

mock.module("~/services", () => ({
  service: {
    listing: { get: { search: () => Effect.succeed([listing]) } },
  },
}));

const { Listing: Goods } = await import("./z-Listing");

function Harness({ writes, fix = 0 }: { writes: Line[][]; fix?: number }) {
  const [lines, setLines] = useState<Line[]>([]);
  return (
    <Goods
      mode="sale"
      lines={lines}
      issues={new Map()}
      fix={fix}
      onChange={(next) => {
        writes.push(next);
        setLines(next);
      }}
      focusSearch={0}
      focused
      onActivate={() => {}}
    />
  );
}

async function renderWithLine(fix = 0) {
  const writes: Line[][] = [];
  render(<Harness writes={writes} fix={fix} />);
  const search = screen.getByPlaceholderText("Cari barang atau kombo untuk dijual...") as HTMLInputElement;
  fireEvent.change(search, { target: { value: "899123" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() => expect(writes).toHaveLength(1));
  const line = writes[0]?.[0];
  if (line === undefined) throw new Error("no line");
  return {
    writes,
    line,
    grid: screen.getByRole("grid", { name: "Barang yang dijual" }),
    cell: (field: string) => document.getElementById(`cell-${line.id}-${field}`) as HTMLElement,
  };
}

function editor(cell: HTMLElement): HTMLInputElement | null {
  return cell.querySelector("input");
}

function selected(): string[] {
  return [...document.querySelectorAll('[aria-selected="true"]')].map((cell) => cell.id);
}

describe("arrow keys inside an editor", () => {
  test("Right at the end commits the value and moves to the next cell", async () => {
    const { writes, cell, grid, line } = await renderWithLine();

    fireEvent.click(cell("name"));
    fireEvent.keyDown(grid, { key: "Enter" });
    const field = editor(cell("name")) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "Kopi Susu Panas" } });
    field.setSelectionRange(field.value.length, field.value.length);

    fireEvent.keyDown(field, { key: "ArrowRight" });

    expect(editor(cell("name"))).toBeNull();
    expect(writes.at(-1)?.[0]?.name).toBe("Kopi Susu Panas");
    expect(selected()).toEqual([`cell-${line.id}-grandTotal`]);
  });

  test("Left at the start commits and walks to the previous cell, wrapping rows", async () => {
    const { writes, cell, grid } = await renderWithLine();

    fireEvent.click(cell("name"));
    fireEvent.keyDown(grid, { key: "Enter" });
    const field = editor(cell("name")) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "Teh" } });
    field.setSelectionRange(0, 0);

    fireEvent.keyDown(field, { key: "ArrowLeft" });

    expect(editor(cell("name"))).toBeNull();
    expect(writes.at(-1)?.[0]?.name).toBe("Teh");
    // The first press backs out of `Nama` onto `no#`; the next walks on into the
    // header, because the flat order wraps across rows.
    expect(selected()).toEqual([`cell-${writes.at(-1)?.[0]?.id}-no`]);
    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    expect(selected()).toEqual(["cell-header-toggle"]);
  });

  test("an arrow inside the value just moves the caret", async () => {
    const { writes, cell, grid } = await renderWithLine();

    fireEvent.click(cell("name"));
    fireEvent.keyDown(grid, { key: "Enter" });
    const field = editor(cell("name")) as HTMLInputElement;
    field.setSelectionRange(4, 4);

    fireEvent.keyDown(field, { key: "ArrowRight" });

    expect(editor(cell("name"))).not.toBeNull();
    expect(writes).toHaveLength(1);
  });

  test("Down commits and moves to the row below, in the same column", async () => {
    const { cell, grid, line } = await renderWithLine();

    fireEvent.click(cell("name"));
    fireEvent.keyDown(grid, { key: "Enter" });

    fireEvent.keyDown(editor(cell("name")) as HTMLInputElement, { key: "ArrowDown" });

    expect(editor(cell("name"))).toBeNull();
    expect(selected()).toEqual([`cell-${line.id}-code`]);
  });

  test("Down off the last row hands the selection to the settle strip", async () => {
    const writes: Line[][] = [];
    let exits = 0;
    function ExitHarness() {
      const [lines, setLines] = useState<Line[]>([]);
      return (
        <Goods
          mode="sale"
          lines={lines}
          issues={new Map()}
          onChange={(next) => {
            writes.push(next);
            setLines(next);
          }}
          focusSearch={0}
          onExitDown={() => {
            exits += 1;
          }}
          focused
          onActivate={() => {}}
        />
      );
    }
    render(<ExitHarness />);
    const search = screen.getByPlaceholderText("Cari barang atau kombo untuk dijual...") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "899123" } });
    fireEvent.keyDown(search, { key: "Enter" });
    await waitFor(() => expect(writes).toHaveLength(1));
    const line = writes[0]?.[0];
    if (line === undefined) throw new Error("no line");
    const grid = screen.getByRole("grid", { name: "Barang yang dijual" });

    // The line's last editable row is the bottom half; put the cursor on `Harga`.
    fireEvent.click(document.getElementById(`cell-${line.id}-price`) as HTMLElement);
    fireEvent.keyDown(grid, { key: "Enter" });
    fireEvent.keyDown(
      document.querySelector(`#cell-${line.id}-price input`) as HTMLInputElement,
      { key: "ArrowDown" },
    );

    expect(exits).toBe(1);
  });
});

describe("a decimal price on a record with a `fix`", () => {
  test("is not rounded once the editor closes", async () => {
    const { cell, grid } = await renderWithLine(4);

    fireEvent.click(cell("price"));
    fireEvent.keyDown(grid, { key: "Enter" });
    const field = editor(cell("price")) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "Rp12.000,35" } });
    fireEvent.keyDown(field, { key: "Enter" });

    const shown = editor(cell("price"));
    expect(shown).toBeNull();
    expect(cell("price").textContent).toContain("12.000,35");
  });
});
