import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { Effect } from "effect";
import { extractRecord } from "./util-validate-record";

/**
 * The import boundary refuses a bad file *before* anything is written, and says
 * which record is at fault — a 10 MB backup is not something to search by hand.
 */
function file(content: unknown): File {
  return new File([JSON.stringify(content)], "riwayat.json", { type: "application/json" });
}

const record = {
  paidAt: 1_000,
  rounding: 0,
  isCredit: false,
  cashier: "Kasir",
  mode: "incoming",
  pay: 10_000,
  note: "",
  fix: 0,
  customer: { name: "", phone: "" },
  subTotal: 10_000,
  total: 10_000,
  methods: [{ methodId: "cash", pay: 10_000 }],
  listings: [
    {
      listingId: null,
      name: "Kopi",
      kind: "retail",
      price: 10_000,
      qty: 1,
      capital: 5_000,
      total: 10_000,
      discounts: [],
    },
  ],
  extras: [],
};

async function message(content: unknown): Promise<string> {
  const result = await Effect.runPromise(Effect.either(extractRecord(file(content))));
  if (result._tag === "Right") return "ok";
  return result.left._tag === "JsonError" ? result.left.e.message : "terlalu besar";
}

// A refused file logs the raw zod error on purpose — that is the diagnostic the
// operator sends us — so keep the console quiet instead of dropping the log. A
// green run that prints four stack traces trains people to ignore red output.
let consoleError: ReturnType<typeof spyOn>;
beforeAll(() => {
  consoleError = spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  consoleError.mockRestore();
});

describe("import file validation", () => {
  test("a well-formed file is accepted", async () => {
    expect(await message([record])).toBe("ok");
  });

  test("a negative or zero quantity is refused", async () => {
    for (const qty of [-3, 0]) {
      const bad = { ...record, listings: [{ ...record.listings[0], qty }] };
      expect(await message([bad])).toContain("tidak sah");
    }
  });

  test("a negative price or capital is refused", async () => {
    const price = { ...record, listings: [{ ...record.listings[0], price: -1 }] };
    const capital = { ...record, listings: [{ ...record.listings[0], capital: -1 }] };
    expect(await message([price])).toContain("tidak sah");
    expect(await message([capital])).toContain("tidak sah");
  });

  test("a record with no lines or a fix out of range is refused", async () => {
    expect(await message([{ ...record, listings: [] }])).toContain("tidak sah");
    expect(await message([{ ...record, fix: 250 }])).toContain("tidak sah");
  });

  test("the message names the offending record", async () => {
    const bad = { ...record, listings: [{ ...record.listings[0], qty: -1 }] };
    expect(await message([record, bad])).toContain("catatan ke-2");
  });

  test("an empty file is refused", async () => {
    expect(await message([])).toContain("tidak sah");
  });
});
