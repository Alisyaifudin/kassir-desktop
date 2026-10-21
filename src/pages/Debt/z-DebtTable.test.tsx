import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { DebtRecord } from "~/services/record";
import { DebtTable } from "./z-DebtTable";

/**
 * The debt table's sort is kept in the URL, so it survives navigation — which is
 * exactly why it has to be announced: the direction used to be an unlabelled
 * arrow, and both states read as "Total".
 */
function debt(overrides: Partial<DebtRecord> = {}): DebtRecord {
  return {
    id: "a",
    paidAt: 1_000,
    creditAt: 1_000,
    note: "utang",
    fix: 0,
    total: 10_000,
    ...overrides,
  };
}

function renderTable(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <DebtTable records={[debt()]} />
    </MemoryRouter>,
  );
}

describe("Debt table sort headers", () => {
  test("aria-sort follows the URL params", () => {
    renderTable("/debt?sort-by=total&sort-dir=asc");

    expect(screen.getByRole("columnheader", { name: /total/i }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(
      screen.getByRole("columnheader", { name: /tanggal/i }).getAttribute("aria-sort"),
    ).toBe("none");
  });

  test("clicking the sorted header flips the direction and says so", () => {
    renderTable("/debt?sort-by=total&sort-dir=asc");

    fireEvent.click(screen.getByRole("button", { name: /urutkan menurut total, naik/i }));

    expect(screen.getByRole("columnheader", { name: /total/i }).getAttribute("aria-sort")).toBe(
      "descending",
    );
    expect(
      screen.getByRole("button", { name: /urutkan menurut total, turun/i }),
    ).toBeTruthy();
  });
});
