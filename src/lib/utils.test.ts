/**
 * Guards the two URL/form numeric helpers, which five parsers trust.
 *
 * Both were written with `||` instead of `&&`, so the "must be a number / a
 * whole number" rule was unreachable: `integer.parse("abc")` succeeded and
 * produced `NaN` (`?page=abc` → empty table, `NaN/NaN` footer) and
 * `numerish.parse("")` produced `0`. The range hooks below are the two call
 * sites where that used to crash: `Temporal.Instant.fromEpochMilliseconds(3.7)`
 * throws a `RangeError` during render.
 *
 * Run with:  bun test src/lib/utils.test.ts
 */
import { describe, expect, spyOn, test } from "bun:test";
import { capitalize, cn, formatError, getURLBack, integer, numeric, urlBackOf } from "./utils";
import { EARLIEST_EPOCH, FURTHEST_EPOCH, parseRange } from "./range";

function params(entries: Record<string, string>): { get(key: string): string | null } {
  return { get: (key) => entries[key] ?? null };
}

describe("integer", () => {
  test.each(["abc", "3.7", "", "NaN", "Infinity", "1e999", "  "])("%p is rejected", (raw) => {
    expect(integer.safeParse(raw).success).toBe(false);
  });

  test.each([
    ["42", 42],
    ["-1", -1],
    ["0", 0],
    [" 7 ", 7],
  ])("%p becomes %d", (raw, expected) => {
    expect(integer.parse(raw)).toBe(expected);
  });

  test("catch() falls back when the value is not a whole number", () => {
    expect(integer.catch(1).parse("abc")).toBe(1);
    expect(integer.catch(1).parse("3.7")).toBe(1);
  });
});

describe("numerish", () => {
  test("rejects the empty string instead of reading it as zero", () => {
    expect(numeric.safeParse("").success).toBe(false);
  });

  test("rejects a non-numeric string", () => {
    expect(numeric.safeParse("abc").success).toBe(false);
  });

  test("keeps decimals and negatives", () => {
    expect(numeric.parse("68000.5")).toBe(68000.5);
    expect(numeric.parse("-2")).toBe(-2);
  });
});

describe("getURLBack", () => {
  test("keeps a rooted in-app path", () => {
    expect(getURLBack("/", new URLSearchParams({ url_back: "/records?day=1" }))).toBe(
      "/records?day=1",
    );
  });

  test.each(["//evil.com", "https://evil.com", "records", ""])(
    "%p falls back to the caller's default",
    (raw) => {
      expect(getURLBack("/money", new URLSearchParams({ url_back: raw }))).toBe("/money");
    },
  );

  test("no param falls back", () => {
    expect(getURLBack("/", new URLSearchParams())).toBe("/");
    expect(urlBackOf(new URLSearchParams())).toBeNull();
  });
});

describe("capitalize", () => {
  test("title-cases a normal name", () => {
    expect(capitalize("budi santoso")).toBe("Budi Santoso");
  });

  // The helper is rendered on the login picker, the day list and the receipt, so
  // it must be total: a padded, doubled or empty name renders as-is, never throws.
  test.each([
    ["", ""],
    [" ", ""],
    ["Budi  Santoso", "Budi Santoso"],
    [" Budi ", "Budi"],
    ["\tBudi\nSantoso", "Budi Santoso"],
  ])("%p becomes %p without throwing", (raw, expected) => {
    expect(capitalize(raw)).toBe(expected);
  });
});

describe("parseRange", () => {
  const defaults = { start: EARLIEST_EPOCH + 1000, end: FURTHEST_EPOCH - 1000 };

  test("uses the URL values when they are valid epoch millis", () => {
    const raw = { start: `${EARLIEST_EPOCH + 5000}`, end: `${FURTHEST_EPOCH - 5000}` };
    expect(parseRange(params(raw), defaults)).toEqual({
      start: EARLIEST_EPOCH + 5000,
      end: FURTHEST_EPOCH - 5000,
    });
  });

  test.each([
    { start: "abc", end: "abc" },
    { start: "3.7", end: "3.7" },
    { start: "", end: "" },
    // Outside `Temporal.Instant`'s range: these are what used to throw.
    { start: `${Number.MAX_SAFE_INTEGER}`, end: `${Number.MAX_SAFE_INTEGER}` },
    { start: "-99999999999999", end: "-99999999999999" },
  ])("falls back per bound for %p", (raw) => {
    expect(parseRange(params(raw), defaults)).toEqual(defaults);
  });

  test("a missing param falls back too", () => {
    expect(parseRange(params({}), defaults)).toEqual(defaults);
  });
});

describe("cn", () => {
  // The app sizes text with its own tokens. tailwind-merge would read
  // `text-small` as a colour and drop it as soon as a real colour class shows
  // up, so the tokens are declared as font sizes; this is that declaration.
  test("a size token survives next to a colour class", () => {
    const merged = cn("text-small", "text-muted-foreground");
    expect(merged).toContain("text-small");
    expect(merged).toContain("text-muted-foreground");
  });

  test("two size tokens still resolve to the last one", () => {
    expect(cn("text-small", "text-big")).toBe("text-big");
  });

  test("conditional and skipped values are dropped", () => {
    const hidden = false;
    expect(cn("p-2", undefined, null, hidden && "hidden", { "font-bold": true, hidden })).toBe(
      "p-2 font-bold",
    );
  });
});

describe("formatError", () => {
  test("a thrown string is its own message", () => {
    expect(formatError("Gagal")).toBe("Gagal");
  });

  test("an Error reports its message, not its stack", () => {
    expect(formatError(new Error("database is locked"))).toBe("database is locked");
  });

  test("anything else is logged and rendered as a known sentence", () => {
    const logged = spyOn(console, "error").mockImplementation(() => {});
    expect(formatError({ code: 5 })).toBe("Error tidak dikenal");
    expect(logged).toHaveBeenCalledWith({ code: 5 });
    logged.mockRestore();
  });
});
