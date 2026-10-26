import { describe, expect, test } from "bun:test";
import { catalogueStatements, type CatalogueLine, type CatalogueLink } from "./catalogue";

/**
 * A committed line's name and price are snapshots on the record — but they are
 * also the operator's latest word on the goods. These statements decide what
 * that word is allowed to change in the catalogue, and a wrong one here either
 * drops the shelf price to the buying price (a purchase reprice) or silently
 * renames a variant's product.
 */
const link = (overrides: Partial<CatalogueLink> = {}): CatalogueLink => ({
  listingId: "l1",
  productId: "p1",
  listingName: "Aqua 240ml",
  listingPrice: 3000,
  listingUnit: 1,
  siblings: 1,
  ...overrides,
});

const line = (overrides: Partial<CatalogueLine> = {}): CatalogueLine => ({
  name: "Aqua 240ml",
  price: 3000,
  unit: 1,
  ...overrides,
});

/** Which tables a statement list writes to, in order. */
const targets = (statements: ReturnType<typeof catalogueStatements>) =>
  statements.map((statement) => statement.sql.match(/UPDATE (\w+)/)?.[1]);

describe("catalogueStatements", () => {
  test("a line rung up exactly as the catalogue has it writes nothing", () => {
    expect(catalogueStatements(link(), line(), "incoming", 500)).toEqual([]);
    expect(catalogueStatements(link(), line(), "outcoming", 500)).toEqual([]);
  });

  test("a rename follows the listing, and with one listing the product too", () => {
    const statements = catalogueStatements(link(), line({ name: "Aqua Botol" }), "incoming", 500);

    expect(targets(statements)).toEqual(["listings", "products"]);
    expect(statements[0].bindings).toEqual(["Aqua Botol", 500, "l1"]);
    // One listing means renaming the line is renaming the goods themselves.
    expect(statements[1].bindings).toEqual(["Aqua Botol", 500, "p1"]);
  });

  test("a variant rename leaves the product's name alone", () => {
    const statements = catalogueStatements(
      link({ siblings: 2 }),
      line({ name: "Aqua Botol" }),
      "incoming",
      500,
    );

    expect(targets(statements)).toEqual(["listings", "products"]);
    // The product still needs its sync stamp cleared — a child moved.
    expect(statements[1].bindings).toEqual([500, "p1"]);
    expect(statements[1].sql).not.toContain("product_name");
  });

  test("a rename is compared trimmed, so stray spaces are not an edit", () => {
    expect(catalogueStatements(link(), line({ name: "  Aqua 240ml  " }), "incoming", 500)).toEqual(
      [],
    );
  });

  test("a blank name is not a rename", () => {
    expect(catalogueStatements(link(), line({ name: "   " }), "incoming", 500)).toEqual([]);
  });

  test("a sale reprices the listing and stamps the product", () => {
    const statements = catalogueStatements(link({ siblings: 3 }), line({ price: 3500 }), "incoming", 500);

    expect(targets(statements)).toEqual(["listings", "products"]);
    expect(statements[0].bindings).toEqual([3500, 500, "l1"]);
    expect(statements[1].bindings).toEqual([500, "p1"]);
  });

  test("a purchase does not touch the shelf price", () => {
    // The line price on a purchase is what the supplier charged.
    expect(catalogueStatements(link(), line({ price: 2500 }), "outcoming", 500)).toEqual([]);
  });

  test("a price in a unit other than the listing's is not the listing's price", () => {
    // Buying a dozen where the shelf sells pieces says nothing about the piece price.
    const statements = catalogueStatements(
      link({ listingUnit: 1 }),
      line({ price: 36000, unit: 12 }),
      "incoming",
      500,
    );
    expect(statements).toEqual([]);
  });

  test("a negative or non-finite price is ignored", () => {
    expect(catalogueStatements(link(), line({ price: -1 }), "incoming", 500)).toEqual([]);
    expect(catalogueStatements(link(), line({ price: Number.NaN }), "incoming", 500)).toEqual([]);
  });

  test("a rename and a reprice on one line touch the product once", () => {
    const statements = catalogueStatements(link(), line({ name: "Aqua Botol", price: 3500 }), "incoming", 500);

    expect(targets(statements)).toEqual(["listings", "products", "listings"]);
    expect(statements.map((statement) => statement.bindings)).toEqual([
      ["Aqua Botol", 500, "l1"],
      ["Aqua Botol", 500, "p1"],
      [3500, 500, "l1"],
    ]);
  });

  test("every write clears the sync stamp so the change is pushed", () => {
    const statements = catalogueStatements(link(), line({ name: "Aqua Botol", price: 3500 }), "incoming", 500);
    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) expect(statement.sql).toContain("sync_at = NULL");
  });
});
