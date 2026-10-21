import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ListingHistoryPage } from "~/services/record";

/**
 * `/records/search` is how a shopkeeper finds a past sale, so its result list
 * has to work from the keyboard. It used to be mouse-only: the rows were inert
 * and the only focusable thing per row was an unnamed icon button (100 of them
 * per page). Now the list is one tab stop with a roving tabindex, arrows move
 * inside it and Enter opens the record — the same model as the day list.
 */
const page: ListingHistoryPage = {
  // More rows exist than this page carries, so the "Lebih banyak" row renders.
  total: 5,
  entries: [
    { id: "l1", recordId: "r1", paidAt: 1_700_000_000_000, name: "Kopi", qty: 2, price: 10_000 },
    { id: "l2", recordId: "r2", paidAt: 1_700_000_000_000, name: "Teh", qty: 1, price: 5_000 },
  ],
} as ListingHistoryPage;

/** Every limit the page asked the service for, in order. */
const limits: number[] = [];

mock.module("./use-data", () => ({
  useData: (limit: number) => {
    limits.push(limit);
    return { type: "success", data: page };
  },
}));

const { Search } = await import("./z-Search");

function renderSearch() {
  render(
    <MemoryRouter initialEntries={["/records/search"]}>
      <Routes>
        <Route path="/records/search" element={<Search />} />
        <Route path="/records/:id" element={<div>detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("record search results keyboard model", () => {
  beforeEach(() => {
    limits.length = 0;
  });

  test("the list is one tab stop", () => {
    renderSearch();
    // The header row is the first, then the data rows.
    const [, first, second] = screen.getAllByRole("row");
    expect(first?.getAttribute("tabindex")).toBe("0");
    expect(second?.getAttribute("tabindex")).toBe("-1");
  });

  test("ArrowDown moves the cursor inside the list", () => {
    renderSearch();
    const [, first, second] = screen.getAllByRole("row");
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second!);
  });

  test("Enter opens the focused record", () => {
    renderSearch();
    const [, first] = screen.getAllByRole("row");
    fireEvent.keyDown(first!, { key: "Enter" });
    expect(screen.getByText("detail")).toBeTruthy();
  });

  test("a row carries its record as its accessible name", () => {
    renderSearch();
    const [, first] = screen.getAllByRole("row");
    expect(first?.getAttribute("aria-label")).toContain("Kopi");
  });

  test("the rows are not an atomic live region", () => {
    renderSearch();
    // The result pane used to be `<output>`, i.e. `role="status"` +
    // `aria-atomic`: every keystroke re-read up to 100 rows × 7 cells aloud.
    const live = document.querySelectorAll('[role="status"],[aria-live]');
    expect(live).toHaveLength(1);
    const status = live[0];
    expect(status?.textContent).toBe("Menampilkan 2 dari 5 hasil.");
    expect(status?.querySelector("table")).toBeNull();
    expect(document.querySelector("output")).toBeNull();
  });

  test("the load-more control has a name", () => {
    renderSearch();
    expect(screen.getByRole("button", { name: "Muat hasil berikutnya" })).toBeTruthy();
  });

  test("no unnamed control hides in the result list", () => {
    renderSearch();
    // The magnifier is the only button; it is named.
    expect(screen.getByRole("button", { name: "Cari transaksi" })).toBeTruthy();
  });
});

describe("record search paging scope", () => {
  /** Change the term and submit, the way an operator does. */
  function searchFor(term: string) {
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: term } });
    fireEvent.submit(input.closest("form")!);
  }

  test("a new search goes back to one page", () => {
    renderSearch();

    fireEvent.click(screen.getByRole("button", { name: "Muat hasil berikutnya" }));
    expect(limits.at(-1)).toBe(200);

    searchFor("teh");

    // The previous query's expansion is not an instruction about this one.
    expect(limits.at(-1)).toBe(100);
  });

  test("a new search puts the tab stop back on the first row", () => {
    renderSearch();

    const [, first, second] = screen.getAllByRole("row");
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(second?.getAttribute("tabindex")).toBe("0");

    searchFor("teh");

    const [, newFirst, newSecond] = screen.getAllByRole("row");
    expect(newFirst?.getAttribute("tabindex")).toBe("0");
    expect(newSecond?.getAttribute("tabindex")).toBe("-1");
  });
});
