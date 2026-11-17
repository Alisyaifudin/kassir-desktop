import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { LineClassification } from "~/services/report";
import { KategoriCell } from "./z-KategoriCell";

/**
 * The cell's three states are the whole visual language of the classifier: the
 * missing one is what blocks the day, so it has to be the thing the eye finds,
 * and a guess has to read as a guess.
 *
 * Rendering only — no interaction. Picking a category fires a mutation through the
 * real service singleton, which is the e2e suite's job (`e2e/report.e2e.ts`).
 */
const CATEGORIES = [
  { id: "cat-jual", name: "Jual" },
  { id: "cat-ongkir", name: "Ongkir" },
];

function classify(overrides: Partial<LineClassification> = {}): LineClassification {
  return {
    lineId: "g1",
    source: "listing",
    categoryId: "cat-jual",
    auto: true,
    sourceRev: 1,
    ...overrides,
  };
}

/** Renders the cell and returns its stated classification. */
function stateOf(category: LineClassification | undefined) {
  const { container } = render(
    <KategoriCell
      recordId="r1"
      source="listing"
      lineId="g1"
      category={category}
      categories={CATEGORIES}
    />,
  );
  return container.querySelector("[data-classification]")?.getAttribute("data-classification");
}

describe("KategoriCell", () => {
  test("an unclassified line reads `missing` and asks to be picked", () => {
    expect(stateOf(undefined)).toBe("missing");
    const field = screen.getByLabelText("Kategori") as HTMLInputElement;

    expect(field.getAttribute("placeholder")).toBe("Pilih");
    expect(field.value).toBe("");
    // Dashed: the shape the eye scans for down a column of solid fields.
    expect(field.className).toContain("border-dashed");
  });

  test("a guessed category reads `guess` and shows its name", () => {
    expect(stateOf(classify({ auto: true }))).toBe("guess");

    const field = screen.getByLabelText("Kategori") as HTMLInputElement;
    expect(field.value).toBe("Jual");
    expect(field.className).not.toContain("border-dashed");
  });

  test("typing does not write anything: the field's text is not a category", () => {
    // The regression. `Combobox` reports the field's raw text on every keystroke,
    // so the cell used to file `p`, `pe`, `pen`… as categories and the service
    // refused each one with "Kategori tidak ditemukan." while the operator typed.
    const { container } = render(
      <KategoriCell
        recordId="r1"
        source="listing"
        lineId="g1"
        category={undefined}
        categories={CATEGORIES}
      />,
    );

    const field = screen.getByLabelText("Kategori") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "Penyesuaian" } });

    // Still undecided, and nothing failed.
    expect(
      container.querySelector("[data-classification]")?.getAttribute("data-classification"),
    ).toBe("missing");
    expect(screen.queryByRole("alert")).toBeNull();
    // The typed text survives in the field, ready for the create row.
    expect(field.value).toBe("Penyesuaian");
  });

  test("a category the operator chose reads `chosen`", () => {
    expect(stateOf(classify({ auto: false, categoryId: "cat-ongkir" }))).toBe("chosen");

    const field = screen.getByLabelText("Kategori") as HTMLInputElement;
    expect(field.value).toBe("Ongkir");
    expect(field.className).not.toContain("border-dashed");
  });
});
