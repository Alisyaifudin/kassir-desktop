/**
 * Pins the insert statements' columns to their bindings.
 *
 * A statement is where a binding goes missing or lands one slot off, and a
 * whole-cart integration case answers "did this sale write?" but not "which
 * column did it write". These are the same assertions `stock-sql.test.ts` makes
 * about the FIFO statements: the SQL shape and the binding order, without a
 * database.
 *
 * Run with:  bun test src/services/record/sql/insert.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  insertDiscounts,
  insertMethod,
  insertPortion,
  insertRecordStatement,
  type RecordHeader,
} from "./insert";

const HEADER: RecordHeader = {
  createdAt: 1000,
  paidAt: 1000,
  creditAt: null,
  rounding: 0,
  cashier: "Ali",
  mode: "incoming",
  pay: 50000,
  note: "",
  fix: 0,
  customer: { name: "Budi", phone: "0812" },
  supplier: { id: null, name: "" },
  subTotal: 50000,
  total: 50000,
};

describe("insert statements", () => {
  test("the record header binds one value per column, in column order", () => {
    const { sql, bindings: rawBindings } = insertRecordStatement("rec-1", HEADER, 2000);
    const bindings = rawBindings!;

    // `record_sync_at` and `record_deleted_at` are written as literal NULLs, so
    // the VALUES list is one placeholder shorter than the column list.
    const columns = sql.slice(sql.indexOf("(") + 1, sql.indexOf(")")).split(",").length;
    const values = sql.slice(sql.indexOf("VALUES (") + 8, sql.lastIndexOf(")")).split(",");
    expect(values.filter((value) => value.trim().startsWith("$"))).toHaveLength(bindings.length);
    expect(columns).toBe(bindings.length + 2);
    expect(bindings).toEqual([
      "rec-1",
      1000, // created_at
      1000, // paid_at
      0, // rounding
      null, // credit_at
      "Ali", // cashier
      "incoming", // mode
      50000, // pay
      "", // note
      0, // fix
      "Budi", // customer name
      "0812", // customer phone
      null, // supplier id
      "", // supplier name
      50000, // sub total
      50000, // total
      2000, // updated_at
      0, // flag
    ]);
  });

  test("a portion writes its twelve columns in order", () => {
    const { sql, bindings } = insertPortion({
      id: "p1",
      groupId: "g1",
      recordId: "rec-1",
      productEventId: null,
      productId: "prod-1",
      name: "Kopi",
      kind: "pcs",
      unit: 1,
      price: 20000,
      qty: 2,
      capital: 15000,
      total: 40000,
    });

    expect(sql).toContain("INSERT INTO record_listings");
    expect(bindings).toEqual([
      "p1",
      "g1",
      "rec-1",
      null,
      "prod-1",
      "Kopi",
      "pcs",
      1,
      20000,
      2,
      15000,
      40000,
    ]);
  });

  test("a discount's effective amount is scaled by the portion's share of the qty", () => {
    const [statement] = insertDiscounts("p1", [{ kind: "percent", value: 10, eff: 2000 }], 0.5);

    const built = statement!;
    const builtBindings = built.bindings!;
    expect(built.sql).toContain("INSERT INTO discounts");
    // The last binding is `discount_eff * share`: half the line's qty, half the
    // discount. The value stays as it was configured.
    expect(builtBindings.slice(3)).toEqual(["percent", 10, 1000]);
    // A fresh id per copy, so two portions of one line are separate rows.
    expect(builtBindings[0]).not.toBe(builtBindings[1]);
  });

  test("every discount gets its own statement", () => {
    const statements = insertDiscounts(
      "p1",
      [
        { kind: "percent", value: 5, eff: 500 },
        { kind: "number", value: 1000, eff: 1000 },
      ],
      1,
    );
    expect(statements).toHaveLength(2);
    expect(statements[1]!.bindings!.slice(3)).toEqual(["number", 1000, 1000]);
  });

  test("a payment row binds the record, the method and what was paid", () => {
    const { sql, bindings } = insertMethod("rec-1", "cash", 50000);
    expect(sql).toContain("INSERT INTO record_methods");
    expect(bindings!.slice(1)).toEqual(["rec-1", "cash", 50000]);
  });
});
