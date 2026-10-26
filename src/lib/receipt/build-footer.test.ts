import { describe, expect, test } from "bun:test";
import type { Info } from "~/services/info";
import type { Social } from "~/services/social";
import { buildFooterSection } from "./build-footer";

/**
 * The foot of the receipt: the shop's parting lines, then the contacts. Both are
 * free text the operator edits in Settings, so they reach the printer as typed —
 * one centered row per footer line, and one row per contact.
 */
const info = (footer: string): Info => ({
  name: "Kassir",
  owner: "Toko Contoh",
  address: "Jl. Contoh 1",
  footer,
  header: "",
  showCashier: false,
});

const social = (name: string, value: string): Social => ({
  id: name,
  name,
  value,
  updatedAt: 1,
  syncAt: null,
});

describe("buildFooterSection", () => {
  test("each footer line is its own centered row, in order", () => {
    const rows = buildFooterSection(info("Terima kasih\nBarang yang dibeli tidak dapat ditukar"), []);

    expect(rows).toEqual([
      { kind: "center", size: "normal", text: "Terima kasih" },
      { kind: "center", size: "normal", text: "Barang yang dibeli tidak dapat ditukar" },
    ]);
  });

  test("contacts print after the footer, one long row each", () => {
    const rows = buildFooterSection(info("Terima kasih"), [
      social("WA", "0812"),
      social("IG", "@warung"),
    ]);

    expect(rows.slice(1)).toEqual([
      { kind: "long", size: "normal", text: "WA: 0812" },
      { kind: "long", size: "normal", text: "IG: @warung" },
    ]);
  });

  test("an empty footer is one empty centered row, and no contacts add nothing", () => {
    // `"".split("\n")` is `[""]`, so the section always has the footer slot; the
    // printer draws no glyphs for it, only the line it would have occupied.
    expect(buildFooterSection(info(""), [])).toEqual([
      { kind: "center", size: "normal", text: "" },
    ]);
  });
});
