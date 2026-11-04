import { describe, expect, test } from "bun:test";
import { labelOf } from "./label";

/**
 * What the log calls a row.
 *
 * The rules an operator would notice if they broke: a named row prints its name,
 * the two entities with no name column print the figure that identifies them, and
 * a row with neither prints nothing at all rather than an empty gap.
 */

describe("labelOf", () => {
  test("names a catalogue row by its own name", () => {
    expect(labelOf("product", { product_name: "Masker Kain" })).toBe("Masker Kain");
    expect(labelOf("listing", { listing_name: "Masker Kain 50 pcs" })).toBe("Masker Kain 50 pcs");
    expect(labelOf("customer", { customer_name: "Budi" })).toBe("Budi");
    expect(labelOf("pocket", { pocket_name: "Kas Toko" })).toBe("Kas Toko");
  });

  test("trims, and treats an empty name as no name", () => {
    expect(labelOf("product", { product_name: "  Masker  " })).toBe("Masker");
    expect(labelOf("product", { product_name: "   " })).toBeNull();
    expect(labelOf("product", {})).toBeNull();
  });

  test("prefers the note on a money row, and falls back to the amount", () => {
    expect(labelOf("money", { money_note: "Beli gas", money_value: 50_000 })).toBe("Beli gas");
    expect(labelOf("money", { money_note: "", money_value: 50_000 })).toBe("Rp 50.000");
    expect(labelOf("money", {})).toBeNull();
  });

  test("identifies a record by the customer, or by its total", () => {
    expect(labelOf("record", { record_customer_name: "Budi", record_total: 125_000 })).toBe("Budi");
    expect(labelOf("record", { record_customer_name: "", record_total: 125_000 })).toBe(
      "Rp 125.000",
    );
  });

  test("says which way a stock event went, and by how much", () => {
    // Positive is a receipt, negative is a take: the sign is the direction, and
    // the magnitude is the amount. The screen supplies the noun.
    expect(labelOf("product_event", { product_event_value: 5 })).toBe("masuk 5");
    expect(labelOf("product_event", { product_event_value: -1 })).toBe("keluar 1");
    expect(labelOf("product_event", {})).toBeNull();
  });

  test("prints the property key, and nothing for an entity it does not know", () => {
    expect(labelOf("property", { property_key: "warna", property_value: "hitam" })).toBe("warna");
    expect(labelOf("something_new", { name: "x" })).toBeNull();
  });
});
