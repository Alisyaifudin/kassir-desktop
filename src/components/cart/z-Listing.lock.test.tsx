import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { Line } from "./types";

/**
 * The drag handle as a cell of the grid.
 *
 * Dragging is a mouse gesture, and the operator who has been ringing items up
 * from the keyboard should not have to reach for the mouse to fix the order of
 * two lines. A double click on the handle locks the card, the up and down arrows
 * then move that card through the list (a move, not a cursor step), and Esc — or
 * a click anywhere — puts the grid back to normal.
 *
 * What is pinned here is the two-ways-to-say-it contract: a keyboard move is the
 * same `arrayMove` a drop performs, and the arrows mean one thing or the other,
 * never both.
 */
const catalogue: Listing[] = [
  {
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
  },
];

mock.module("~/services", () => ({
  service: {
    listing: {
      get: {
        search: () => Effect.succeed([...catalogue]),
        all: () => Effect.succeed([...catalogue]),
      },
    },
  },
}));

const { Listing: Goods } = await import("./z-Listing");

function Harness({ writes }: { writes: Line[][] }) {
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
      focused
      onActivate={() => {}}
    />
  );
}

function cart(): HTMLElement {
  return screen.getByRole("grid", { name: "Barang yang dijual" });
}

function cell(lineId: string, field: string): HTMLElement {
  const node = document.getElementById(`cell-${lineId}-${field}`);
  if (node === null) throw new Error(`no cell ${field}`);
  return node;
}

/** `+manual` twice: two lines with nothing behind them, newest on top. */
function twoLines() {
  const writes: Line[][] = [];
  render(<Harness writes={writes} />);
  for (let index = 0; index < 2; index++) {
    fireEvent.click(document.getElementById("cell-header-manual") as HTMLElement);
    fireEvent.keyDown(cart(), { key: "Enter" });
  }
  const [newest, older] = writes.at(-1) ?? [];
  if (newest === undefined || older === undefined) throw new Error("no lines");
  return { writes, newest, older };
}

describe("the locked card", () => {
  test("a double click on the handle locks it, and the arrows move it", () => {
    const { writes, newest, older } = twoLines();

    fireEvent.doubleClick(cell(newest.id, "grip"));
    // The handle is the cell the cursor is standing on.
    expect(cell(newest.id, "grip").getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(cart(), { key: "ArrowDown" });
    expect((writes.at(-1) ?? []).map((line) => line.id)).toEqual([older.id, newest.id]);

    fireEvent.keyDown(cart(), { key: "ArrowUp" });
    expect((writes.at(-1) ?? []).map((line) => line.id)).toEqual([newest.id, older.id]);
  });

  test("arrowing past the end of the list leaves the order alone", () => {
    const { writes, newest } = twoLines();

    fireEvent.doubleClick(cell(newest.id, "grip"));
    const before = writes.length;
    // The locked card is already first, so there is nowhere to go up to.
    fireEvent.keyDown(cart(), { key: "ArrowUp" });

    expect(writes).toHaveLength(before);
  });

  test("Esc hands the arrows back to the cursor", () => {
    const { writes, newest, older } = twoLines();

    fireEvent.doubleClick(cell(newest.id, "grip"));
    const before = writes.length;
    fireEvent.keyDown(cart(), { key: "Escape" });
    fireEvent.keyDown(cart(), { key: "ArrowDown" });

    // The cursor moved off the handle — onto the next card's number cell — and
    // the list was not reordered on the way.
    expect(writes).toHaveLength(before);
    expect(cart().getAttribute("aria-activedescendant")).toBe(`cell-${older.id}-no`);
  });

  test("a click anywhere lets the card go", () => {
    const { writes, newest } = twoLines();

    fireEvent.doubleClick(cell(newest.id, "grip"));
    const before = writes.length;
    fireEvent.click(cart());
    fireEvent.keyDown(cart(), { key: "ArrowDown" });

    expect(writes).toHaveLength(before);
  });
});
