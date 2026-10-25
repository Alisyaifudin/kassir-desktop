import { describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { Line } from "./types";

/**
 * Typing a number over a selected cell.
 *
 * On a till the operator does not press Enter and then clear a field: a number
 * typed on a selected cell *is* the new value, so the editor opens with that digit
 * and the old value is gone. Nothing happened at all before this — the grid
 * ignored printable keys, and the value sat there.
 *
 * The cells this applies to are the numeric ones (`price`, `unit`, `qty`, and the
 * payment strip's `Pembulatan`/`Nilai`); `nama` and `kode` still need Enter,
 * because a digit is a legitimate first character of a name.
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
    listing: {
      get: {
        search: () => Effect.succeed([listing]),
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

/** One line in the cart, and the grid it lives in. */
async function renderWithLine() {
  const writes: Line[][] = [];
  render(<Harness writes={writes} />);
  const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;
  fireEvent.change(search, { target: { value: "899123" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() => expect(writes).toHaveLength(1));
  const line = writes[0]?.[0];
  if (line === undefined) throw new Error("no line");
  return { writes, line, grid: screen.getByRole("grid", { name: "Barang yang dijual" }) };
}

/** The editor inside a cell, once it is open. */
function editor(cellId: string): HTMLInputElement | null {
  const cell = document.getElementById(cellId);
  return cell?.querySelector("input") ?? null;
}

describe("a digit typed on a selected cell", () => {
  test("opens the price editor with that digit alone", async () => {
    const { line, grid } = await renderWithLine();

    fireEvent.click(document.getElementById(`cell-${line.id}-price`) as HTMLElement);
    fireEvent.keyDown(grid, { key: "5" });

    const field = editor(`cell-${line.id}-price`);
    expect(field).not.toBeNull();
    // The money editor shows the value as it stands: the 10.000 is gone.
    expect(field?.value).toBe("Rp5");
  });

  test("does the same for the quantity, and the next digit appends", async () => {
    const { line, grid } = await renderWithLine();

    // The quantity cell selects from its label; its arrows bump instead.
    fireEvent.click(screen.getByText("Kuantitas"));
    fireEvent.keyDown(grid, { key: "3" });

    const field = editor(`cell-${line.id}-qty`);
    expect(field?.value).toBe("3");
    fireEvent.change(field as HTMLInputElement, { target: { value: "37" } });
    expect(editor(`cell-${line.id}-qty`)?.value).toBe("37");
  });

  test("a name cell keeps Enter as its way in — a digit is part of a name", async () => {
    const { line, grid } = await renderWithLine();

    fireEvent.click(document.getElementById(`cell-${line.id}-name`) as HTMLElement);
    fireEvent.keyDown(grid, { key: "5" });

    expect(editor(`cell-${line.id}-name`)).toBeNull();
  });

  test("Enter still opens the editor on the value, not on a key typed earlier", async () => {
    const { line, grid } = await renderWithLine();

    // A digit seeds the price editor, then Escape throws it away…
    fireEvent.click(document.getElementById(`cell-${line.id}-price`) as HTMLElement);
    fireEvent.keyDown(grid, { key: "5" });
    fireEvent.keyDown(editor(`cell-${line.id}-price`) as HTMLInputElement, { key: "Escape" });

    // …and Enter must open the committed value again, not resurrect the 5.
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(editor(`cell-${line.id}-price`)?.value).toBe("Rp10.000");
  });
});
