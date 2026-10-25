import { beforeEach, describe, expect, mock, test } from "bun:test";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import type { Listing } from "~/services/listing";
import type { Line } from "./types";

/**
 * Copy and paste on the grid's cells.
 *
 * The rhythm this serves: fill a column, not a cell. `Ctrl+C` on a selected cell
 * puts its value on the clipboard (with a toast, so the operator knows something
 * happened), and `Ctrl+V` writes the clipboard into the selected cell and **stays
 * in select mode** — an editor opening after every paste would end the run.
 *
 * A paste is coerced by the cell's own constraint: a price keeps digits only, so
 * `Rp10.000` pastes as 10000, and a name takes one line of whatever was copied.
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

const toasts: string[] = [];
mock.module("sonner", () => ({
  toast: {
    success: (message: string) => toasts.push(message),
    error: (message: string) => toasts.push(`error: ${message}`),
    warning: (message: string) => toasts.push(message),
  },
}));

mock.module("~/services", () => ({
  service: {
    listing: { get: { search: () => Effect.succeed([listing]) } },
  },
}));

// The clipboard the webview would expose; each test sets what is on it.
let copyBuffer = "";
const written: string[] = [];
Object.defineProperty(globalThis.navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: async (text: string) => {
      written.push(text);
      copyBuffer = text;
    },
    readText: async () => copyBuffer,
  },
});

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

/** One line in the cart, its grid, and the cell ids it renders. */
async function renderWithLine() {
  const writes: Line[][] = [];
  render(<Harness writes={writes} />);
  const search = screen.getByPlaceholderText("Cari barang untuk dijual...") as HTMLInputElement;
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

/** The editor inside a cell, when one is open. */
function editor(cell: HTMLElement | null): HTMLInputElement | null {
  return cell?.querySelector("input") ?? null;
}

beforeEach(() => {
  copyBuffer = "";
  written.length = 0;
  toasts.length = 0;
});

describe("copying a selected cell", () => {
  test("copies the price as bare digits and says so", async () => {
    const { cell, grid } = await renderWithLine();

    fireEvent.click(cell("price"));
    fireEvent.keyDown(grid, { key: "c", ctrlKey: true });

    await waitFor(() => expect(written).toEqual(["10000"]));
    expect(toasts).toEqual(["Disalin: 10000"]);
  });

  test("copies a name and a code verbatim", async () => {
    const { cell, grid } = await renderWithLine();

    fireEvent.click(cell("name"));
    fireEvent.keyDown(grid, { key: "c", ctrlKey: true });
    await waitFor(() => expect(written).toEqual(["Kopi Susu"]));

    fireEvent.click(cell("code"));
    fireEvent.keyDown(grid, { key: "c", ctrlKey: true });
    await waitFor(() => expect(written).toEqual(["Kopi Susu", "899123"]));
  });

  test("a cell that holds no value copies nothing", async () => {
    const { cell, grid } = await renderWithLine();

    // The line total is selectable but is not a value the operator owns.
    fireEvent.click(cell("grandTotal"));
    fireEvent.keyDown(grid, { key: "c", ctrlKey: true });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(written).toEqual([]);
    expect(toasts).toEqual([]);
  });
});

describe("pasting into a selected cell", () => {
  test("writes the clipboard into the cell and stays in select mode", async () => {
    const { cell, grid, writes } = await renderWithLine();
    copyBuffer = "15000";

    fireEvent.click(cell("price"));
    fireEvent.keyDown(grid, { key: "v", ctrlKey: true });

    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.[0]?.price).toBe(15_000);
    // Select mode, not edit mode: no input mounted, the arrows still work.
    expect(editor(cell("price"))).toBeNull();
  });

  test("a formatted price pastes as its digits", async () => {
    const { cell, grid, writes } = await renderWithLine();
    copyBuffer = "Rp12.500";

    fireEvent.click(cell("price"));
    fireEvent.keyDown(grid, { key: "v", ctrlKey: true });

    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.[0]?.price).toBe(12_500);
  });

  test("a numeric cell keeps only digits; a name takes text", async () => {
    const { cell, grid, writes } = await renderWithLine();

    copyBuffer = " 12 pcs ";
    // The quantity cell selects from its label; its arrows bump instead.
    fireEvent.click(screen.getByText("Kuantitas"));
    fireEvent.keyDown(grid, { key: "v", ctrlKey: true });
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.[0]?.qty).toBe(12);

    copyBuffer = "Teh\nManis";
    fireEvent.click(cell("name"));
    fireEvent.keyDown(grid, { key: "v", ctrlKey: true });
    await waitFor(() => expect(writes).toHaveLength(3));
    expect(writes[2]?.[0]?.name).toBe("Teh Manis");
  });

  test("a paste with nothing usable in it changes nothing", async () => {
    const { grid, writes } = await renderWithLine();
    copyBuffer = "abc";

    fireEvent.click(screen.getByText("Kuantitas"));
    fireEvent.keyDown(grid, { key: "v", ctrlKey: true });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(writes).toHaveLength(1);
  });

  test("while an editor is open the browser keeps its own paste", async () => {
    const { cell, grid, writes } = await renderWithLine();
    copyBuffer = "15000";

    // Enter opens the price editor; a paste there is the field's business.
    fireEvent.click(cell("price"));
    fireEvent.keyDown(grid, { key: "Enter" });
    const field = editor(cell("price"));
    expect(field).not.toBeNull();

    fireEvent.keyDown(field as HTMLInputElement, { key: "v", ctrlKey: true });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(writes).toHaveLength(1);
  });

  test("the webview's own paste event is the fallback when the API is missing", async () => {
    const { cell, grid, writes } = await renderWithLine();

    fireEvent.click(cell("unit"));
    fireEvent.paste(grid, { clipboardData: { getData: () => "3" } });

    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.[0]?.unit).toBe(3);
  });
});
