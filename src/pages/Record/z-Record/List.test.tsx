import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { Record as RecordModel } from "~/services/record";
import { List } from "./List";
import type { MethodSelection } from "../method-filter";

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
    pairId: null,
    ...overrides,
  };
}

function renderList(records: RecordModel[], selection?: MethodSelection) {
  return render(
    <MemoryRouter initialEntries={["/records"]}>
      <List records={records} selection={selection} />
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

describe("Record list sort headers", () => {
  test("a header toggles aria-sort none → ascending → descending", () => {
    renderList([record({ id: "a" }), record({ id: "b" })]);
    const header = screen.getByRole("columnheader", { name: /total/i });

    // The sort lives in the URL, so this also survives navigation.
    expect(header.getAttribute("aria-sort")).toBe("none");

    // The first click adopts the current direction (desc) on the new column, the
    // second flips it — the same model the header button always had.
    fireEvent.click(screen.getByRole("button", { name: /urutkan menurut total/i }));
    expect(screen.getByRole("columnheader", { name: /total/i }).getAttribute("aria-sort")).toBe(
      "descending",
    );

    fireEvent.click(screen.getByRole("button", { name: /urutkan menurut total, turun/i }));
    expect(screen.getByRole("columnheader", { name: /total/i }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
  });

  test("the direction is in the button's accessible name, not only in the arrow", () => {
    renderList([record({ id: "a" })]);
    const button = screen.getByRole("button", { name: /urutkan menurut waktu/i });
    expect(button.textContent).toContain("Waktu");
  });
});

/**
 * A record paid with two methods shows each method's money on its own line under
 * the record's total — but only for the methods the filter kept, and never at the
 * cost of the keyboard model (the payment lines are a breakdown, not rows).
 */
const splitPayments: RecordModel["methods"] = [
  { id: "rm1", methodId: "1000", pay: 15_000, name: null, kind: "cash" },
  { id: "rm2", methodId: "1005", pay: 5_000, name: "Mandiri", kind: "qris" },
];

const splitRecord = record({ id: "a", methods: splitPayments, grandTotal: 20_000 });

describe("Record list split payments", () => {
  test("each payment gets a line, and the number spans the group", () => {
    renderList([splitRecord]);
    const rows = screen.getAllByRole("row");

    // Header, the record, and one line per payment.
    expect(rows).toHaveLength(4);
    expect(rows[1]?.firstElementChild?.getAttribute("rowspan")).toBe("3");

    expect(screen.getByText("Tunai")).toBeDefined();
    expect(screen.getByText("QRIS Mandiri")).toBeDefined();
    expect(screen.getByText("15.000")).toBeDefined();
    expect(screen.getByText("5.000")).toBeDefined();
    expect(screen.getByText("20.000")).toBeDefined();
  });

  test("a filter that keeps one payment collapses the record to the one line", () => {
    renderList([splitRecord], { kinds: ["cash"], methods: [] });
    const rows = screen.getAllByRole("row");

    expect(rows).toHaveLength(2);
    expect(screen.queryByText("QRIS Mandiri")).toBeNull();
    // Filtering hides lines; the record's own total does not move.
    expect(screen.getByText("20.000")).toBeDefined();
  });

  test("clicking a payment line opens the record it belongs to", () => {
    renderList([splitRecord, record({ id: "b", date: 500 })]);
    const rows = screen.getAllByRole("row");

    // A pointer on the breakdown selects the record, not a line of it.
    fireEvent.click(screen.getByText("QRIS Mandiri"));

    expect(rows[1]?.getAttribute("aria-selected")).toBe("true");
    expect(rows[3]?.hasAttribute("aria-selected")).toBe(false);
    expect(rows[4]?.getAttribute("aria-selected")).toBe("false");
  });

  test("the payment lines are not rows of the keyboard model", () => {
    // The list opens newest-first, so the split record needs the later date to
    // sit above the other one; its payment lines then follow it.
    renderList([splitRecord, record({ id: "b", date: 500 })]);
    const rows = screen.getAllByRole("row");

    // Only the two record rows are in the tab order, never their payment lines.
    expect(rows.filter((row) => row.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(rows[2]?.hasAttribute("tabindex")).toBe(false);

    // Down walks from the first record straight to the second, over the lines.
    fireEvent.keyDown(rows[1]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[4]!);
  });
});
