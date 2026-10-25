/**
 * Pins how the stock section decides to fold a lot away. The rule exists because
 * the journal keeps every lot it ever made: an old product carries a row per
 * purchase, most of them sold out, and the section stopped being readable.
 *
 * The two halves that are easy to get wrong are pinned here: what counts as
 * "empty" (an unpaid-for draft row is not), and when the product is too small to
 * fold at all (one lot *is* the stock, sold out or not).
 *
 * Run with:  bun test src/pages/Product/Form/stock-groups.test.ts
 */
import { describe, expect, test } from "bun:test";
import { foldedLabel, groupStocks, isEmptyLot } from "./stock-groups";
import type { StockDraft } from "./types";

const lot = (key: string, value: string, capital: string): StockDraft => ({ key, value, capital });

const allMayFold = () => true;
const noneMayFold = () => false;

describe("which lots fold away", () => {
  test("a product with one lot never folds it — that lot is the stock", () => {
    const only = lot("a", "0", "500");

    expect(groupStocks([only], allMayFold)).toEqual({ active: [only], folded: [] });
  });

  test("a lot with no quantity yet is not empty", () => {
    expect(isEmptyLot(lot("a", "", "500"))).toBe(false);
    expect(isEmptyLot(lot("a", "  ", "500"))).toBe(false);
    expect(isEmptyLot(lot("a", "0", "500"))).toBe(true);
    expect(isEmptyLot(lot("a", "-2", "500"))).toBe(true);
    expect(isEmptyLot(lot("a", "3", "500"))).toBe(false);
  });

  test("sold-out lots fold, and the rows that stay keep their order", () => {
    const first = lot("a", "5", "500");
    const empty = lot("b", "0", "700");
    const second = lot("c", "12", "900");

    expect(groupStocks([first, empty, second], allMayFold)).toEqual({
      active: [first, second],
      folded: [empty],
    });
  });

  test("every lot sold out folds all of them — the section still says they exist", () => {
    const a = lot("a", "0", "500");
    const b = lot("b", "0", "700");

    expect(groupStocks([a, b], allMayFold)).toEqual({ active: [], folded: [a, b] });
  });

  test("a row being typed into stays put — the caller says which may fold", () => {
    const first = lot("a", "5", "500");
    const empty = lot("b", "0", "700");

    expect(groupStocks([first, empty], noneMayFold)).toEqual({
      active: [first, empty],
      folded: [],
    });
  });
});

describe("the accordion's label", () => {
  test("counts the lots and names the range of what they cost", () => {
    expect(foldedLabel([lot("a", "0", "500"), lot("b", "0", "1200")])).toBe(
      "2 lot habis · Modal 500–1.200",
    );
  });

  test("one cost reads as one figure, however many lots share it", () => {
    expect(foldedLabel([lot("a", "0", "900")])).toBe("1 lot habis · Modal 900");
    expect(foldedLabel([lot("a", "0", "900"), lot("b", "0", "900")])).toBe(
      "2 lot habis · Modal 900",
    );
  });

  test("the range is numeric, not lexicographic", () => {
    expect(foldedLabel([lot("a", "0", "900"), lot("b", "0", "1200")])).toBe(
      "2 lot habis · Modal 900–1.200",
    );
  });

  test("thousands are grouped the way the rest of the form groups them", () => {
    expect(foldedLabel([lot("a", "0", "5000"), lot("b", "0", "12500")])).toBe(
      "2 lot habis · Modal 5.000–12.500",
    );
  });
});
