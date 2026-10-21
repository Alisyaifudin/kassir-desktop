import { describe, expect, test } from "bun:test";
import type { Listing } from "~/services/listing";
import type { DraftListing } from "~/services/transaction";
import { findLineIssues, hasHardIssue } from "./code-issues";

function listing(overrides: Partial<Listing> & { id: string }): Listing {
  return {
    id: overrides.id,
    productId: overrides.productId ?? `product-${overrides.id}`,
    name: overrides.name ?? overrides.id,
    price: overrides.price ?? 1000,
    unit: overrides.unit ?? 1,
    kind: overrides.kind ?? "retail",
    code: overrides.code ?? null,
    codeKind: overrides.codeKind ?? null,
    cover: null,
    stock: 0,
    productName: overrides.productName ?? overrides.id,
    altNames: [],
  };
}

function line(overrides: Partial<DraftListing> & { id: string }): DraftListing {
  return {
    id: overrides.id,
    listingId: overrides.listingId ?? null,
    name: overrides.name ?? "Barang",
    code: overrides.code ?? "",
    unit: overrides.unit ?? 1,
    price: overrides.price ?? 1000,
    qty: overrides.qty ?? 1,
    discounts: [],
  };
}

describe("findLineIssues", () => {
  test("a new barcode colliding with an existing barcode is hard", () => {
    const issues = findLineIssues(
      [line({ id: "a", code: "ABC" })],
      [listing({ id: "l1", code: "abc", codeKind: "barcode", name: "Kopi" })],
    );
    const issue = issues.get("a");
    expect(issue?.code?.tone).toBe("error");
    expect(issue?.code?.messages[0].text).toContain("Kopi");
    expect(issue?.code?.messages[0].productIds).toEqual(["product-l1"]);
    expect(hasHardIssue(issues)).toBe(true);
  });

  test("a new barcode colliding with a QR is only a warning", () => {
    const issues = findLineIssues(
      [line({ id: "a", code: "ABC" })],
      [listing({ id: "l1", code: "abc", codeKind: "qr", name: "Kopi" })],
    );
    expect(issues.get("a")?.code?.tone).toBe("warning");
    expect(hasHardIssue(issues)).toBe(false);
  });

  test("two new lines with the same code are both hard, numbered from the bottom", () => {
    const lines = [
      line({ id: "a", code: "abc", name: "A" }),
      line({ id: "b", code: "ABC", name: "B" }),
    ];
    const issues = findLineIssues(lines, []);
    expect(issues.get("a")?.code?.tone).toBe("error");
    expect(issues.get("b")?.code?.tone).toBe("error");
    // `a` is first in the array (top, number 2); `b` is second (bottom, number 1).
    expect(issues.get("a")?.code?.messages[0].text).toContain("#1");
    expect(issues.get("b")?.code?.messages[0].text).toContain("#2");
    expect(hasHardIssue(issues)).toBe(true);
  });

  test("a manual line with no name or a zero unit is hard", () => {
    const issues = findLineIssues([line({ id: "a", name: " ", unit: 0 })], []);
    expect(issues.get("a")?.name).toBe(true);
    expect(issues.get("a")?.unit).toBe(true);
    expect(hasHardIssue(issues)).toBe(true);
  });

  test("catalog lines are not checked", () => {
    const issues = findLineIssues(
      [line({ id: "a", listingId: "l1", code: "abc", name: "" })],
      [listing({ id: "l1", code: "abc", codeKind: "barcode" })],
    );
    expect(issues.size).toBe(0);
  });

  test("a code with no collision has no issue", () => {
    const issues = findLineIssues([line({ id: "a", code: "abc" })], []);
    expect(issues.size).toBe(0);
  });
});
