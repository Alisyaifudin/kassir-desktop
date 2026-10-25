import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { Effect } from "effect";
import { extractProduct } from "./util-validate-product";

/**
 * The import boundary refuses a bad file *before* anything is written, and the
 * message names the product and the row at fault. A negative price used to be
 * accepted here and only surfaced at `Bayar`, on a sale, with no way back to the
 * catalogue row that caused it.
 */
function file(content: unknown): File {
  return new File([JSON.stringify(content)], "produk.json", { type: "application/json" });
}

const product = {
  name: "Kopi Susu",
  note: "",
  listings: [
    {
      name: "Kopi Susu 250ml",
      price: 15_000,
      unit: 1,
      kind: "retail",
      code: null,
    },
  ],
  stocks: [{ value: 10, capital: 9_000 }],
  properties: [],
};

async function message(content: unknown): Promise<string> {
  const result = await Effect.runPromise(Effect.either(extractProduct(file(content))));
  if (result._tag === "Right") return "ok";
  return result.left._tag === "JsonError" ? result.left.e.message : "terlalu besar";
}

// A refused file logs the raw reason on purpose — it is the diagnostic the
// operator sends us — so keep the console quiet instead of dropping the log.
let consoleError: ReturnType<typeof spyOn>;
beforeAll(() => {
  consoleError = spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  consoleError.mockRestore();
});

describe("product import file validation", () => {
  test("a well-formed product is accepted", async () => {
    expect(await message([product])).toBe("ok");
  });

  test("a negative price is refused, naming the product", async () => {
    const bad = { ...product, listings: [{ ...product.listings[0], price: -10_000 }] };
    expect(await message([bad])).toBe(
      "Produk ke-1 (Kopi Susu): Harga Kopi Susu 250ml tidak valid",
    );
  });

  test("a negative stock capital is refused", async () => {
    const bad = { ...product, stocks: [{ value: 5, capital: -900 }] };
    expect(await message([bad])).toBe("Produk ke-1 (Kopi Susu): Modal Kopi Susu tidak valid");
  });

  test("a negative stock value is refused", async () => {
    const bad = { ...product, stocks: [{ value: -50, capital: 900 }] };
    expect(await message([bad])).toBe("Produk ke-1 (Kopi Susu): Stok Kopi Susu tidak valid");
  });

  test("one good product does not excuse a bad one", async () => {
    const bad = { ...product, name: "Teh Manis", stocks: [{ value: 1, capital: -1 }] };
    expect(await message([product, bad])).toBe(
      "Produk ke-2 (Teh Manis): Modal Teh Manis tidak valid",
    );
  });

  test("a file with no products is refused", async () => {
    expect(await message([])).not.toBe("ok");
  });
});
