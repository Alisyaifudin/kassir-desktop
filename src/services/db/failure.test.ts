/**
 * The database layer used to compose every failure as
 * `Gagal mengeksekusi query: \n<raw driver text>`, and every domain service
 * copied that string into its own error, which the page fallbacks render
 * verbatim: a locked or corrupt database showed the cashier an English SQLite
 * sentence with an embedded newline and table names.
 *
 * Run with:  bun test src/services/db/failure.test.ts
 */
import { describe, expect, test } from "bun:test";
import { DB_READ_FAILED, dbFailure } from "./failure";

describe("dbFailure", () => {
  test("the cashier sees one sentence; the driver text goes to the detail", () => {
    const error = dbFailure(DB_READ_FAILED, new Error('near "FROM": syntax error'));

    expect(error.message).toBe(DB_READ_FAILED);
    expect(error.message).not.toContain("syntax error");
    expect(error.message).not.toContain("\n");
    expect(error.detail).toContain("syntax error");
  });

  test("a non-Error failure still keeps its diagnostic", () => {
    const error = dbFailure(DB_READ_FAILED, "database is locked");

    expect(error.message).not.toContain("database is locked");
    expect(error.detail).toBe("database is locked");
  });

  test("a driver failure with no message at all still renders something", () => {
    const error = dbFailure(DB_READ_FAILED, {});
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.detail.length).toBeGreaterThan(0);
  });
});
