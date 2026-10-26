import { describe, expect, spyOn, test } from "bun:test";
import { decodeTime } from "ulid";
import { generateId } from "./random";

/**
 * Ids for every row the app writes by itself — customers, socials, records. They
 * are ULIDs, so the time part is what lets `socials` keep insertion order and
 * what the sync layer sorts by; a broken id is not a display nit, it is a row
 * that collides or sorts into the past.
 */
describe("generateId", () => {
  test("is a ULID: 26 Crockford characters", () => {
    expect(generateId()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  test("stamps the current instant into the time prefix", () => {
    const before = Date.now() - 1_000;
    const id = generateId();
    const after = Date.now() + 1_000;

    const stamped = decodeTime(id);
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(after);
  });

  test("a thousand calls are all distinct", () => {
    const ids = new Set(Array.from({ length: 1_000 }, () => generateId()));
    expect(ids.size).toBe(1_000);
  });

  test("ids made in the same millisecond differ, so uniqueness rests on the tail", () => {
    const clock = spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    try {
      const first = generateId();
      const second = generateId();
      expect(decodeTime(first)).toBe(1_700_000_000_000);
      expect(decodeTime(second)).toBe(1_700_000_000_000);
      expect(first).not.toBe(second);
    } finally {
      clock.mockRestore();
    }
  });
});
