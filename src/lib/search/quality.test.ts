import { describe, expect, test } from "bun:test";
import { analyze } from "./normalize";
import { TEXT, gradeCode, gradeText, type TextOptions } from "./quality";

/**
 * The ladder every search box climbs. Two things are worth pinning: which tier a
 * query earns (a full token-set must beat a fragment, a typo must come last), and
 * that the optional tiers stay optional — a one-character query may not
 * prefix-match, and a two-character one may not fuzz.
 */
const WIDE: TextOptions = { tokenPrefix: true, weak: true };
const STRICT: TextOptions = { tokenPrefix: false, weak: false };

function grade(field: string, query: string, options: TextOptions = WIDE) {
  const normalisedField = analyze(field);
  const normalisedQuery = analyze(query);
  return gradeText(
    normalisedField.norm,
    normalisedField.words,
    normalisedQuery.norm,
    normalisedQuery.words,
    options,
  );
}

describe("the ladder", () => {
  test("the tiers are ordered, highest first", () => {
    expect(TEXT.exact).toBeGreaterThan(TEXT.tokenSet);
    expect(TEXT.tokenSet).toBeGreaterThan(TEXT.prefix);
    expect(TEXT.prefix).toBeGreaterThan(TEXT.tokenPrefix);
    expect(TEXT.tokenPrefix).toBeGreaterThan(TEXT.subsequence);
    expect(TEXT.subsequence).toBeGreaterThan(TEXT.typo);
    expect(TEXT.typo).toBeGreaterThan(0);
  });
});

describe("gradeText", () => {
  test("the whole field equal to the query is the exact tier", () => {
    expect(grade("Nasi Goreng", "nasi goreng")).toBe(TEXT.exact);
  });

  test("every query word present, in any order, outranks a fragment", () => {
    expect(grade("Nasi Goreng Spesial", "goreng nasi")).toBe(TEXT.tokenSet);
    // A fragment is a prefix match, a tier below.
    expect(grade("Nasi Goreng Spesial", "nasi gor")).toBe(TEXT.prefix);
  });

  test("a prefix of a later word still counts as a phrase prefix", () => {
    expect(grade("Es Teh Manis", "teh man")).toBe(TEXT.prefix);
  });

  test("each query word prefixing a distinct field word is the token-prefix tier", () => {
    expect(grade("Nasi Goreng", "nas gor")).toBe(TEXT.tokenPrefix);
  });

  test("letters in order with gaps are the subsequence tier", () => {
    expect(grade("Nasi Goreng", "nsg")).toBe(TEXT.subsequence);
  });

  test("a near miss is the typo tier, below a subsequence", () => {
    const typo = grade("Nasi Goreng", "nassi");
    expect(typo).toBeGreaterThan(0);
    expect(typo).toBeLessThan(TEXT.subsequence);
    expect(typo).toBeLessThanOrEqual(TEXT.typo);
  });

  test("a clean token cannot carry a misspelt one", () => {
    // "goreng" matches exactly but "nassi" does not; the worst token decides.
    expect(grade("Nasi Goreng", "nassi goreng")).toBeLessThan(TEXT.tokenSet);
  });

  test("the optional tiers are gated by the query length", () => {
    // Two characters may prefix, but not fuzz or match inside a word.
    expect(grade("Nasi Goreng", "nas gor", STRICT)).toBe(0);
    // Without the weak tiers, a one-character query only matches at a word start.
    expect(grade("Nasi Goreng", "n", STRICT)).toBe(TEXT.prefix);
    expect(grade("Nasi Goreng", "o", STRICT)).toBe(0);
    // A whole word matches the token-set tier with no options at all.
    expect(grade("Nasi Goreng", "nasi", STRICT)).toBe(TEXT.tokenSet);
  });

  test("an empty query or field matches nothing", () => {
    expect(grade("Nasi Goreng", "")).toBe(0);
    expect(grade("", "nasi")).toBe(0);
  });
});

describe("gradeCode", () => {
  test("an exact identifier is a full match", () => {
    expect(gradeCode("8991002100", "8991002100")).toBe(1);
  });

  test("a prefix beats an inner match, and both beat no match", () => {
    const prefix = gradeCode("8991002100", "899");
    const inner = gradeCode("8991002100", "100");

    expect(prefix).toBeGreaterThan(inner);
    expect(inner).toBeGreaterThan(0);
    expect(gradeCode("8991002100", "777")).toBe(0);
  });

  test("a short fragment is dampened, so two digits do not match every barcode", () => {
    // Same ratio, different query length: the 2-character query is worth less.
    expect(gradeCode("8991002100", "89")).toBeLessThan(gradeCode("8991", "89"));
  });

  test("empty inputs match nothing", () => {
    expect(gradeCode("8991", "")).toBe(0);
    expect(gradeCode("", "89")).toBe(0);
  });
});
