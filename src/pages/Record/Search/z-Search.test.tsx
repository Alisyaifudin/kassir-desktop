import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { Stream } from "effect";
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

// The results are a page-data source now, so the mock replaces the source and the
// registry reads it — the limit still travels into the query, which is what these
// tests are about.
mock.module("./source", () => ({
  resultsSource: ({ limit }: { limit: number }) => {
    limits.push(limit);
    return Stream.make(page);
  },
}));

const { Search } = await import("./z-Search");

async function renderSearch() {
  render(
    <MemoryRouter initialEntries={["/records/search"]}>
      <Routes>
        <Route path="/records/search" element={<Search />} />
        <Route path="/records/:id" element={<div>detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
  // The rows arrive through the provider, one tick after mount.
  await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(1));
}

describe("record search results keyboard model", () => {
  beforeEach(() => {
    limits.length = 0;
  });

  test("the list is one tab stop", async () => {
    await renderSearch();
    // The header row is the first, then the data rows.
    const [, first, second] = screen.getAllByRole("row");
    expect(first?.getAttribute("tabindex")).toBe("0");
    expect(second?.getAttribute("tabindex")).toBe("-1");
  });

  test("ArrowDown moves the cursor inside the list", async () => {
    await renderSearch();
    const [, first, second] = screen.getAllByRole("row");
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(second!);
  });

  test("Enter opens the focused record", async () => {
    await renderSearch();
    const [, first] = screen.getAllByRole("row");
    fireEvent.keyDown(first!, { key: "Enter" });
    expect(screen.getByText("detail")).toBeTruthy();
  });

  test("a row carries its record as its accessible name", async () => {
    await renderSearch();
    const [, first] = screen.getAllByRole("row");
    expect(first?.getAttribute("aria-label")).toContain("Kopi");
  });

  test("the rows are not an atomic live region", async () => {
    await renderSearch();
    // The result pane used to be `<output>`, i.e. `role="status"` +
    // `aria-atomic`: every keystroke re-read up to 100 rows × 7 cells aloud.
    const live = document.querySelectorAll('[role="status"],[aria-live]');
    expect(live).toHaveLength(1);
    const status = live[0];
    expect(status?.textContent).toBe("Menampilkan 2 dari 5 hasil.");
    expect(status?.querySelector("table")).toBeNull();
    expect(document.querySelector("output")).toBeNull();
  });

  test("the load-more control has a name", async () => {
    await renderSearch();
    expect(screen.getByRole("button", { name: "Muat hasil berikutnya" })).toBeTruthy();
  });

  test("no unnamed control hides in the result list", async () => {
    await renderSearch();
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

  test("a new search goes back to one page", async () => {
    await renderSearch();

    fireEvent.click(screen.getByRole("button", { name: "Muat hasil berikutnya" }));
    expect(limits.at(-1)).toBe(200);

    searchFor("teh");

    // The previous query's expansion is not an instruction about this one.
    await waitFor(() => expect(limits.at(-1)).toBe(100));
  });

  test("a new search puts the tab stop back on the first row", async () => {
    await renderSearch();

    const [, first, second] = screen.getAllByRole("row");
    fireEvent.keyDown(first!, { key: "ArrowDown" });
    expect(second?.getAttribute("tabindex")).toBe("0");

    searchFor("teh");

    const [, newFirst, newSecond] = screen.getAllByRole("row");
    expect(newFirst?.getAttribute("tabindex")).toBe("0");
    expect(newSecond?.getAttribute("tabindex")).toBe("-1");
  });
});
