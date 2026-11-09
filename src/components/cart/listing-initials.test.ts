import { describe, expect, test } from "bun:test";
import { listingInitials } from "./listing-initials";

/**
 * The letters in the box a card draws when the product has no photo.
 *
 * It is a decoration, not a name: the line's own name sits beside it. So the
 * tests are about the shapes a shop's names come in — one word, two, a size glued
 * to the end, a number in front, nothing at all yet — and about never putting
 * something that is not a letter in the box.
 */

describe("listingInitials", () => {
  test("takes the first letter of the first two words", () => {
    expect(listingInitials("Kopi Susu")).toBe("KS");
    expect(listingInitials("Gula Aren Cair")).toBe("GA");
  });

  test("a size after the name does not become an initial", () => {
    expect(listingInitials("Kopi Susu 250ml")).toBe("KS");
    expect(listingInitials("Teh Botol 350 ml")).toBe("TB");
  });

  test("a one-word name gives its one letter", () => {
    expect(listingInitials("Teh")).toBe("T");
    expect(listingInitials("Aqua")).toBe("A");
  });

  test("enough space inside the words does not make a word", () => {
    expect(listingInitials("  Kopi   Susu  ")).toBe("KS");
    expect(listingInitials("Kopi\nSusu")).toBe("KS");
  });

  test("a word that starts with a digit is read past", () => {
    // `2 pcs` is a count, not a name: the box says `PP`.
    expect(listingInitials("2 pcs plastik")).toBe("PP");
    expect(listingInitials("1 dus Aqua")).toBe("DA");
  });

  test("nothing to read draws nothing", () => {
    expect(listingInitials("")).toBe("");
    expect(listingInitials("   ")).toBe("");
    expect(listingInitials("100%")).toBe("");
  });

  test("the case of the name does not travel into the box", () => {
    expect(listingInitials("kopi susu")).toBe("KS");
    expect(listingInitials("KOPI SUSU")).toBe("KS");
  });

  test("accented letters keep their letter", () => {
    expect(listingInitials("écLAIR noir")).toBe("ÉN");
  });

  test("punctuation does not leak in", () => {
    // A leading quote is not a letter, so the word is read from its first letter.
    expect(listingInitials("\"Kopi\" Susu")).toBe("KS");
    expect(listingInitials("Kopi-Susu")).toBe("K");
  });
});
