import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Effect } from "effect";
import { MemoryRouter, useLocation } from "react-router";
import type { DayRecord, ReportCategory, ReportDay, ReportTotals } from "~/services/report";
import type { Info } from "~/services/info";
import { pageData } from "./data";
import { Rail } from "./z-Rail";

/**
 * The rail is the only way into the classifier, so it has to work without a mouse
 * — and it is the only place the day's two totals are added up, so a wrong sum
 * there is a wrong number on screen with no second opinion.
 *
 * `z-Rail` reads through `pageData.Gate`, so the test provides a fake registry of
 * the same shape rather than mocking the service: the gate is part of what is
 * being tested (the rail must not render before its read answers).
 */
function record(overrides: Partial<DayRecord> = {}): DayRecord {
  return {
    id: "a",
    mode: "incoming",
    cashier: "budi",
    date: 1_000,
    fix: 0,
    grandTotal: 10_000,
    isCredit: false,
    lines: 2,
    unclassified: 0,
    stale: 0,
    ...overrides,
  };
}

/**
 * A unique `deps` per render.
 *
 * `Rail` reads through the page's own registry (`./data`), which is cached by
 * `deps` — so without this, the second test would paint the first one's day. Using
 * the real registry rather than a stand-in is the point: it is the same context
 * the gate resolves in the app.
 */
let seq = 0;

function renderRail(records: DayRecord[]) {
  const key = ++seq;
  const day: ReportDay = { started: true, records };

  return render(
    <MemoryRouter initialEntries={["/report"]}>
      <pageData.Provider
        deps={[key]}
        sources={{
          day: Effect.succeed(day),
          progress: Effect.succeed({
            records: records.length,
            lines: 0,
            unclassified: 0,
            stale: 0,
          }),
          categories: Effect.succeed([] as ReportCategory[]),
          // The rail reads `day` alone; the rest exist because the page's source
          // map is typed as a whole and a stand-in that omitted them would not be
          // the same contract.
          totals: Effect.succeed(EMPTY_TOTALS),
          days: Effect.succeed([]),
          started: Effect.succeed(true),
          info: Effect.succeed(EMPTY_INFO),
        }}
      >
        <Rail />
      </pageData.Provider>
      <Location />
    </MemoryRouter>,
  );
}

let search = "";
function Location() {
  search = useLocation().search;
  return null;
}

const params = () => new URLSearchParams(search);

const EMPTY_TOTALS: ReportTotals = {
  incoming: 0,
  outcoming: 0,
  rounding: 0,
  categories: [],
  lines: 0,
  unclassified: 0,
  stale: 0,
  excluded: [],
  discounts: [],
};

const EMPTY_INFO: Info = {
  name: "Toko",
  owner: "Toko",
  address: "",
  footer: "",
  header: "",
  showCashier: true,
};

describe("the day rail", () => {
  test("renders one row per record, in the order it was given", async () => {
    renderRail([
      record({ id: "a", grandTotal: 1_000 }),
      record({ id: "b", grandTotal: 2_000 }),
      record({ id: "c", grandTotal: 3_000 }),
    ]);

    const rows = await screen.findAllByRole("option");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.textContent?.match(/\d[\d.]*$/)?.[0])).toEqual([
      "1.000",
      "2.000",
      "3.000",
    ]);
  });

  test("the two directions are totalled separately, never added together", async () => {
    // Summing a sale and a purchase into one figure is a number that means
    // nothing, so the footer is two figures — and it must add up what the column
    // shows, per record, not a float sum of the raw totals.
    renderRail([
      record({ id: "sale", mode: "incoming", grandTotal: 45_000 }),
      record({ id: "buy", mode: "outcoming", grandTotal: 30_000 }),
      record({ id: "sale2", mode: "incoming", grandTotal: 5_000 }),
    ]);

    await screen.findByText(/Masuk/);
    expect(screen.getByText("Rp50.000")).toBeDefined();
    expect(screen.getByText("Rp30.000")).toBeDefined();
  });

  test("a record with work left is marked, and a finished one is not", async () => {
    renderRail([
      record({ id: "todo", unclassified: 2 }),
      record({ id: "done" }),
      record({ id: "moved", stale: 1 }),
    ]);

    const rows = await screen.findAllByRole("option");
    expect(rows[0]?.textContent).toContain("●");
    expect(rows[1]?.textContent).not.toContain("●");
    // A record edited after classification is still unfinished business.
    expect(rows[2]?.textContent).toContain("●");
  });

  test("clicking a row opens it in the URL, not in local state", async () => {
    renderRail([record({ id: "r1" }), record({ id: "r2" })]);

    const rows = await screen.findAllByRole("option");
    fireEvent.click(rows[1]!);

    expect(params().get("selected")).toBe("r2");
  });

  test("clicking the open row closes the pane again", async () => {
    // The one interaction that is easy to get wrong in a second copy of the hook:
    // a click on the selection toggles it off rather than re-selecting.
    renderRail([record({ id: "r1" })]);
    const [row] = await screen.findAllByRole("option");

    fireEvent.click(row!);
    expect(params().get("selected")).toBe("r1");

    fireEvent.click(row!);
    expect(params().has("selected")).toBe(false);
  });

  test("the list is one tab stop, however many records the day holds", async () => {
    renderRail(Array.from({ length: 12 }, (_, index) => record({ id: `r${index}`, date: index })));

    const rows = await screen.findAllByRole("option");
    expect(rows.filter((row) => row.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(rows[0]?.getAttribute("tabindex")).toBe("0");
  });

  test("Enter selects the focused row and Space does too", async () => {
    renderRail([record({ id: "r1" }), record({ id: "r2" })]);
    const rows = await screen.findAllByRole("option");

    fireEvent.keyDown(rows[0]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]!);

    fireEvent.keyDown(rows[1]!, { key: "Enter" });
    expect(params().get("selected")).toBe("r2");

    fireEvent.keyDown(rows[0]!, { key: " " });
    expect(params().get("selected")).toBe("r1");
  });

  test("an empty day is an empty rail, not a broken one", async () => {
    renderRail([]);

    await screen.findByText(/Masuk/);
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    // Both footers read zero, and neither is missing.
    expect(screen.getAllByText("Rp0")).toHaveLength(2);
  });
});
