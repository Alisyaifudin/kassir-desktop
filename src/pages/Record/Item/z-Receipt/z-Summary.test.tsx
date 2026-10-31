import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { RecordExtra, RecordFull } from "~/services/record";
import { Summary } from "./z-Summary";

/**
 * The receipt preview has to agree with the paper, which the Rust renderer draws
 * (`src-tauri/src/receipt/text.rs`) — so these are the paper's own rules checked
 * from the webview side: the sign leads (`-Rp5.000`, never `Rp-5.000`), a
 * rounding *down* gets its minus too, and every amount is rounded to the
 * record's `fix` rather than printing stored decimals.
 */
const extra = (name: string, eff: number, kind: "number" | "percent" = "number"): RecordExtra =>
  ({ id: name, name, value: 11, eff, kind, flag: 0 }) as RecordExtra;

function record(overrides: Partial<RecordFull> = {}): RecordFull {
  return {
    subTotal: 100_000,
    total: 95_000,
    grandTotal: 94_500,
    rounding: -500,
    pay: 100_000,
    change: 5_500,
    fix: 0,
    isCredit: false,
    listings: [{ id: "l1" }],
    extras: [extra("Diskon", -5_000)],
    ...overrides,
  } as unknown as RecordFull;
}

/** The receipt's money lines, left to right, in the order they are drawn. */
function lines(overrides: Partial<RecordFull> = {}): string[] {
  const { container } = render(<Summary record={record(overrides)} />);
  return [...container.querySelectorAll("p")].map((node) => node.textContent ?? "");
}

describe("receipt summary money", () => {
  test("a negative extra leads with its sign, as it does on paper", () => {
    expect(lines()).toContain("-Rp5.000");
    expect(lines()).not.toContain("Rp-5.000");
  });

  test("a rounding down leads with its sign", () => {
    expect(lines()).toContain("-Rp500");
  });

  test("the money is rounded to the record's fix", () => {
    // A sale whose stored figures carry more decimals than it prints with.
    const shown = lines({
      subTotal: 1492152.94272,
      total: 1492152.94272,
      grandTotal: 1492153,
      rounding: 0,
      extras: [],
    });
    expect(shown).toContain("Rp1.492.153");
    expect(shown.join(" ")).not.toContain(",94");
  });
});
