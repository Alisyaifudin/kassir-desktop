import { describe, expect, test } from "bun:test";
import { restoreOffset, type ListAnchor, type ListView } from "./scroll-anchor";

/**
 * Two views draw one page of products: rows and cards. They cannot share a pixel
 * offset, so the list stores the product at its top-left as well — and this decides
 * which of the two a given box is put back from.
 */
const KEY = "|cash|all|name|asc|2|20";

function anchor(overrides: Partial<ListAnchor> = {}): ListAnchor {
  return { key: KEY, view: "grid", id: "p7", top: 240, ...overrides };
}

/** The offset that would put a product at the top; `null` when it is not on this page. */
function offsetOf(page: Record<string, number>) {
  return (id: string) => page[id] ?? null;
}

const view = (name: ListView) => name;

describe("restoreOffset", () => {
  test("the same view goes back to the pixel it was left at", () => {
    const page = offsetOf({ p7: 1_000 });

    expect(restoreOffset(anchor(), KEY, view("grid"), page)).toBe(240);
  });

  test("the other view puts the product that was on top back on top", () => {
    const table = offsetOf({ p7: 528 });

    // The grid's own offset means nothing in the table: a row is not a card.
    expect(restoreOffset(anchor({ view: "grid" }), KEY, view("table"), table)).toBe(528);
    expect(restoreOffset(anchor({ view: "table", top: 528 }), KEY, view("grid"), offsetOf({ p7: 240 }))).toBe(240);
  });

  test("a product that is not on this page starts the list at the top", () => {
    // Page 1 held a position for p7; page 2 does not list it at all.
    expect(restoreOffset(anchor({ view: "table" }), KEY, view("grid"), offsetOf({ p1: 0 }))).toBe(0);
  });

  test("another result set starts at the top, whatever was stored", () => {
    const page = offsetOf({ p7: 528 });

    // Another page, another filter, another sort: the rows are not the ones the
    // position was read on.
    expect(restoreOffset(anchor({ key: "other" }), KEY, view("grid"), page)).toBe(0);
    expect(restoreOffset(anchor({ key: "other" }), KEY, view("table"), page)).toBe(0);
  });

  test("a list that never scrolled has nothing to put back", () => {
    expect(restoreOffset(anchor({ id: null, top: 0, view: "table" }), KEY, view("grid"), offsetOf({}))).toBe(0);
  });
});
