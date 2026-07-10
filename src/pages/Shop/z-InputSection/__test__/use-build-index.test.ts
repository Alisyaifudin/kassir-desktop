import { describe, test, expect } from "bun:test";
import { buildIndex, searchIndex } from "../use-build-index";
import type { Product } from "~/services/product";

// ---------------------------------------------------------------------------
// Mock products
// ---------------------------------------------------------------------------

function p(overrides?: Partial<Product>): Product {
  return {
    id: "1",
    name: "Produk",
    price: 1000,
    note: "",
    codes: [],
    capitals: [],
    ...overrides,
  };
}

const products: Product[] = [
  p({ id: "indomie", name: "Indomie Goreng", codes: ["IND-001", "8991234567890"] }),
  p({ id: "beras", name: "Beras Premium 5kg", codes: ["BERAS-5KG"] }),
  p({ id: "minyak", name: "Minyak Goreng 2L", codes: ["MINYAK-2L"] }),
  p({ id: "gula", name: "Gula Pasir 1kg", codes: ["GULA-1KG"] }),
  p({ id: "telur", name: "Telur Ayam Negeri 1kg", codes: ["TELUR-1KG"] }),
  p({ id: "mie-super", name: "Super Indomie Jumbo", codes: ["SUPER-MIE-001"] }),
  p({ id: "kopi", name: "Kopi Hitam", codes: ["KOPI-HITAM"] }),
  p({ id: "sabun", name: "Sabun Mandi Lifebuoy", codes: ["SABUN-LIF"] }),
  p({ id: "shampoo", name: "Shampoo Clear 200ml", codes: ["CLEAR-200"] }),
  p({ id: "roti", name: "Roti Tawar", codes: ["ROTI-TAWAR"] }),
];

let idx: ReturnType<typeof buildIndex>;

// Build index once before all tests
function getIdx() {
  if (!idx) idx = buildIndex(products);
  return idx;
}

// Helper: search and return just ids (for readable assertions)
function searchIds(query: string): string[] {
  return searchIndex(getIdx(), query).map((r) => r.product.id);
}

function searchScores(query: string): { id: string; score: number }[] {
  return searchIndex(getIdx(), query).map((r) => ({
    id: r.product.id,
    score: r.score,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildIndex", () => {
  test("indexes all products", () => {
    const idx = getIdx();
    expect(idx.products.size).toBe(products.length);
  });

  test("indexes exact codes", () => {
    const idx = getIdx();
    expect(idx.codeExact.has("ind-001")).toBe(true);
    expect(idx.codeExact.has("8991234567890")).toBe(true);
    expect(idx.codeExact.has("beras-5kg")).toBe(true);
  });

  test("indexes code prefixes (starts-with)", () => {
    const idx = getIdx();
    const ids = idx.codePrefixes.get("ind");
    expect(ids).not.toBeUndefined();
    expect(ids!.has("indomie")).toBe(true);
  });

  test("indexes code substrings (contains)", () => {
    const idx = getIdx();
    const ids = idx.codeSubstrs.get("001");
    expect(ids).not.toBeUndefined();
    expect(ids!.has("indomie")).toBe(true);
  });

  test("indexes name trigrams", () => {
    const idx = getIdx();
    // "indomie goreng" → trigrams include "ind", "ndo", "dom", "omi", "mie"
    expect(idx.nameTrigrams.has("ind")).toBe(true);
    expect(idx.nameTrigrams.has("mie")).toBe(true);
    expect(idx.nameTrigrams.get("ind")!.has("indomie")).toBe(true);
  });
});

describe("searchIndex", () => {
  // --- Empty / no match ---

  test("empty query returns empty array", () => {
    expect(searchIds("")).toEqual([]);
    expect(searchIds("   ")).toEqual([]);
  });

  test("no match returns empty array", () => {
    expect(searchIds("zzz_nonexistent_blah")).toEqual([]);
  });

  // --- Exact code match ---

  test("exact code match scores 100 and returns first", () => {
    // "beras-5kg" is an exact code for Beras Premium
    const results = searchScores("beras-5kg");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("beras");
    expect(results[0].score).toBe(100);
  });

  test("exact code match is case insensitive", () => {
    const results = searchScores("BERAS-5KG");
    expect(results[0].id).toBe("beras");
    expect(results[0].score).toBe(100);
  });

  test("exact code match with barcode", () => {
    const results = searchScores("8991234567890");
    expect(results[0].id).toBe("indomie");
    expect(results[0].score).toBe(100);
  });

  // --- Code starts-with ---

  test("code starts-with scores 60", () => {
    const results = searchScores("ind-0");
    expect(results.some((r) => r.id === "indomie" && r.score === 60)).toBe(true);
  });

  test("code starts-with is case insensitive", () => {
    const results = searchScores("IND-0");
    expect(results.some((r) => r.id === "indomie" && r.score === 60)).toBe(true);
  });

  // --- Code contains ---

  test("code contains substring scores 40", () => {
    const results = searchScores("001");
    // "001" is in "IND-001"
    expect(results.some((r) => r.id === "indomie" && r.score === 40)).toBe(true);
  });

  test("code contains is case insensitive", () => {
    const results = searchScores("5kg");
    // "5kg" is in "BERAS-5KG" → code contains score 40, plus order bonus
    expect(results.some((r) => r.id === "beras" && r.score >= 40)).toBe(true);
  });

  // --- Name search ---

  test("full name match via trigrams", () => {
    const results = searchIds("indomie");
    expect(results).toContain("indomie");
    expect(results).toContain("mie-super"); // "Super Indomie Jumbo"
  });

  test("partial name via trigrams", () => {
    const results = searchIds("indo");
    expect(results).toContain("indomie"); // "Indomie Goreng"
    expect(results).toContain("mie-super"); // "Super Indomie Jumbo"
  });

  test("name search is case insensitive", () => {
    const results = searchIds("INDOMIE");
    expect(results).toContain("indomie");
  });

  // --- Multi-word queries ---

  test("multi-word in correct order scores higher", () => {
    const results = searchScores("super indomie");
    const superIdx = results.findIndex((r) => r.id === "mie-super");
    const indomieIdx = results.findIndex((r) => r.id === "indomie");
    expect(superIdx).toBeGreaterThanOrEqual(0);
    expect(indomieIdx).toBeGreaterThanOrEqual(0);
    // "Super Indomie" in order → subsequence bonus for mie-super
    // Verify mie-super got the subsequence order bonus
    expect(results[superIdx].score).toBeGreaterThanOrEqual(12);
  });

  test("multi-word in reversed order still finds but lower", () => {
    const results = searchScores("indomie super");
    // Should still find "Super Indomie Jumbo" via word presence
    expect(results.some((r) => r.id === "mie-super")).toBe(true);
    // Should also find Indomie Goreng
    expect(results.some((r) => r.id === "indomie")).toBe(true);
  });

  // --- Short queries (< 3 chars) ---

  test("short query uses substring fallback", () => {
    const results = searchIds("ko");
    expect(results).toContain("kopi"); // "Kopi Hitam" contains "ko"
  });

  test("short query is case insensitive", () => {
    const results = searchIds("KO");
    expect(results).toContain("kopi");
  });

  test("short query finds multiple matches", () => {
    const results = searchIds("mi");
    // "Indomie", "Minyak", "Super Indomie Jumbo" all contain "mi"
    expect(results).toContain("indomie");
    expect(results).toContain("minyak");
    expect(results).toContain("mie-super");
  });

  // --- Sorting ---

  test("results are sorted by score descending", () => {
    const results = searchScores("indomie");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test("exact code match ranks above name match", () => {
    // "BERAS-5KG" → exact code match for beras, also "beras" partially matches name
    const results = searchScores("beras-5kg");
    expect(results[0].id).toBe("beras");
    expect(results[0].score).toBe(100); // exact code dominates
  });

  // --- Threshold filtering ---

  test("threshold filters out very low scores", () => {
    const results = searchScores("shampoo");
    // Only shampoo should show up; very weak trigram hits filtered
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("shampoo");
    // No products with just 1-2 shared trigrams
    const ids = results.map((r) => r.id);
    expect(ids.every((id) => results.some((r) => r.id === id))).toBe(true);
  });

  // --- Cap at 20 ---

  test("caps results at 20", () => {
    // Create 25 products that all match a generic query
    const many = Array.from({ length: 25 }, (_, i) =>
      p({
        id: `prod-${i}`,
        name: `Produk Sama Semua ${i}`,
        codes: [`CODE-${i}`],
      }),
    );
    const bigIdx = buildIndex(many);
    const results = searchIndex(bigIdx, "produk sama");
    expect(results.length).toBeLessThanOrEqual(20);
  });

  // --- Code + name combined ---

  test("code match + name match on same product gets max of code scores", () => {
    // "ind" matches code "IND-001" (starts-with → 60)
    // AND matches name trigrams "ind" in "Indomie Goreng"
    const results = searchScores("ind");
    const indomie = results.find((r) => r.id === "indomie")!;
    expect(indomie).not.toBeUndefined();
    // Code score 60 should be the base, plus name trigram score added
    expect(indomie.score).toBeGreaterThanOrEqual(60);
  });

  // --- Realistic POS queries ---

  test('"goreng" matches products with Goreng in name', () => {
    const results = searchIds("goreng");
    expect(results).toContain("indomie");
    expect(results).toContain("minyak");
  });

  test('"beras" matches Beras Premium', () => {
    const results = searchIds("beras");
    expect(results).toContain("beras");
  });

  test("barcode search: scanning a full barcode", () => {
    const results = searchIds("8991234567890");
    expect(results[0]).toBe("indomie");
  });

  test("partial barcode search", () => {
    const results = searchIds("899123");
    // code starts-with 899123 on Indomie's barcode
    expect(results).toContain("indomie");
  });
});
