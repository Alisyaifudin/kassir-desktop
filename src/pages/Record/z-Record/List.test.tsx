import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { Record as RecordModel } from "~/services/record";
import { List } from "./List";

/**
 * The Records list is the only way to open a record's detail pane, so it has to
 * work without a mouse: rows are tabbable, Up/Down walk them, Enter selects, and
 * the selection is announced (`aria-selected`) instead of being a blue tint only.
 */
function record(overrides: Partial<RecordModel> = {}): RecordModel {
  return {
    id: "a",
    createdAt: 1_000,
    date: 1_000,
    paidAt: 1_000,
    creditAt: null,
    rounding: 0,
    isCredit: false,
    cashier: "kasir",
    mode: "incoming",
    pay: 10_000,
    note: "",
    fix: 0,
    customer: { name: "", phone: "" },
    supplier: { id: null, name: "" },
    subTotal: 10_000,
    total: 10_000,
    grandTotal: 10_000,
    change: 0,
    methods: [],
    updatedAt: 1_000,
    syncAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function renderList(records: RecordModel[]) {
  return render(
    <MemoryRouter initialEntries={["/records"]}>
      <List records={records} />
    </MemoryRouter>,
  );
}

describe("Record list keyboard model", () => {
  test("a row is focusable and Enter selects it", () => {
    renderList([record({ id: "a" }), record({ id: "b" })]);
    // Row 0 is the header; the data rows follow it.
    const [, first, second] = screen.getAllByRole("row");

    expect(first?.getAttribute("tabindex")).toBe("0");

    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second!);

    fireEvent.keyDown(second!, { key: "Enter" });

    expect(screen.getByRole("row", { selected: true })).toBe(second as HTMLElement);
  });

  test("Space selects the focused row too", () => {
    renderList([record({ id: "a" })]);
    const [, first] = screen.getAllByRole("row");

    fireEvent.keyDown(first!, { key: " " });

    expect(first?.getAttribute("aria-selected")).toBe("true");
  });

  test("the list is one tab stop, however many records the day holds", () => {
    const records = Array.from({ length: 12 }, (_, i) => record({ id: `r${i}`, date: i }));
    renderList(records);
    const rows = screen.getAllByRole("row").slice(1);

    expect(rows.filter((row) => row.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(rows[0]?.getAttribute("tabindex")).toBe("0");
  });

  test("the selected row is the tab stop, so Tab returns where the operator was", () => {
    renderList([record({ id: "a" }), record({ id: "b" }), record({ id: "c" })]);
    const [, , second] = screen.getAllByRole("row");

    fireEvent.click(second!);

    expect(second?.getAttribute("tabindex")).toBe("0");
    expect(screen.getAllByRole("row").slice(1).filter((row) => row.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  test("Home and End jump to the first and last row", () => {
    renderList([
      record({ id: "a", date: 1 }),
      record({ id: "b", date: 2 }),
      record({ id: "c", date: 3 }),
    ]);
    const rows = screen.getAllByRole("row").slice(1);

    fireEvent.keyDown(rows[1]!, { key: "End" });
    expect(document.activeElement).toBe(rows[2]!);

    fireEvent.keyDown(rows[2]!, { key: "Home" });
    expect(document.activeElement).toBe(rows[0]!);
  });
});
