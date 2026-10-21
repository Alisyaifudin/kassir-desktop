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
});
