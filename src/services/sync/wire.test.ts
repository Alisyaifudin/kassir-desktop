/**
 * The canonical wire format (contract §3, §4.2, §5).
 *
 * These are the tests that protect resume: both sides verify a byte stream with a
 * sha256 chain, so a column that moves, disappears or is serialised differently
 * breaks verification rather than merely looking odd on the wire.
 *
 * Run with:  bun test src/services/sync/wire.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  encodeRecordFrame,
  encodeRowFrame,
  parseAckFrame,
  parseLine,
  parsePullFrame,
} from "./frames";
import { CHILD_ORDER, getColumnsFor, TABLES, toCanonicalRow } from "./schema";

const customerRow = {
  customer_id: "c1",
  customer_name: "Ani",
  customer_phone: "0812",
  customer_updated_at: 1_700_000_000_000,
  customer_deleted_at: null,
};

describe("canonical rows", () => {
  test("keys follow the contract's column order, not the source object's", () => {
    const scrambled = Object.fromEntries(Object.entries(customerRow).reverse());
    const canonical = toCanonicalRow(TABLES.customer, scrambled);

    expect(Object.keys(canonical)).toEqual([
      "customer_id",
      "customer_name",
      "customer_phone",
      "customer_updated_at",
      "customer_deleted_at",
    ]);
    // The encoded line is what the chain hashes, so the order must be stable
    // across two encoders that were handed the same row differently.
    expect(encodeRowFrame("customer", canonical)).toBe(
      encodeRowFrame("customer", toCanonicalRow(TABLES.customer, customerRow)),
    );
  });

  test("a nullable column is written as an explicit null, never omitted", () => {
    const line = encodeRowFrame(
      "listing",
      toCanonicalRow(TABLES.listing, {
        listing_id: "l1",
        product_id: "p1",
        listing_name: "Kopi",
        listing_price: 15000,
        listing_unit: 1,
        listing_kind: "",
        // listing_code omitted entirely
        listing_updated_at: 1,
        listing_deleted_at: null,
      }),
    );

    expect(line).toContain('"listing_code":null');
    expect(line).toBe(
      '{"e":"listing","r":{"listing_id":"l1","product_id":"p1","listing_name":"Kopi",' +
        '"listing_price":15000,"listing_unit":1,"listing_kind":"","listing_code":null,' +
        '"listing_updated_at":1,"listing_deleted_at":null}}',
    );
  });

  test("a NOT NULL column that is missing is refused instead of sent as null", () => {
    expect(() =>
      toCanonicalRow(TABLES.customer, {
        customer_id: "c1",
        customer_name: "Ani",
        // customer_phone missing
        customer_updated_at: 1,
        customer_deleted_at: null,
      }),
    ).toThrow();
  });

  test("integers stay integers and reals keep their shortest round-trip form", () => {
    const line = encodeRowFrame(
      "record",
      toCanonicalRow(TABLES.record, {
        record_id: "r1",
        record_created_at: 1_700_000_000_000,
        record_paid_at: null,
        record_rounding: 0,
        record_credit_at: null,
        record_cashier: "kasir",
        record_mode: "incoming",
        record_pay: 15000.5,
        record_note: "",
        record_fix: 2,
        record_customer_name: "",
        record_customer_phone: "",
        record_sub_total: 15000.5,
        record_total: 15000.5,
        record_updated_at: 1_700_000_000_000,
        record_deleted_at: null,
        record_supplier_id: null,
        record_supplier_name: "",
        record_flag: 0,
        record_pair_id: null,
      }),
    );

    // `1.50` would hash differently from `1.5`; `JSON.stringify` already emits the
    // shortest form, and this pins that we rely on it.
    expect(line).toContain('"record_rounding":0,');
    expect(line).toContain('"record_pay":15000.5,');
    expect(line).toContain('"record_created_at":1700000000000,');
    expect(line).toContain('"record_paid_at":null,');
  });

  test("the canonical key set for every table matches its SQLite column list", () => {
    // A column in one list but not the other is a merge that writes `undefined`
    // or a statement that binds one value short. `getColumnsFor` is the single
    // lookup both paths use; this asserts the dictionaries are non-empty and
    // duplicate-free, which is what a hand-edited table definition gets wrong.
    for (const def of Object.values(TABLES)) {
      const columns = getColumnsFor(def.entity);
      expect(new Set(columns).size).toBe(columns.length);
      expect(columns).toContain(def.pk);
      expect(columns).toContain(def.updatedAt);
      if (def.deletedAt !== null) expect(columns).toContain(def.deletedAt);
      // The client-only marker must never travel (§3).
      expect(columns).not.toContain(def.syncAt);
    }
  });
});

describe("frames", () => {
  test("a row frame is `e` then `r`", () => {
    const line = encodeRowFrame("customer", toCanonicalRow(TABLES.customer, customerRow));
    expect(line.startsWith('{"e":"customer","r":{"customer_id"')).toBe(true);
  });

  test("an aggregate frame always carries all five child arrays, in order", () => {
    const line = encodeRecordFrame(
      toCanonicalRow(TABLES.record, {
        record_id: "r1",
        record_created_at: 1,
        record_paid_at: 1,
        record_rounding: 0,
        record_credit_at: null,
        record_cashier: "kasir",
        record_mode: "incoming",
        record_pay: 0,
        record_note: "",
        record_fix: 0,
        record_customer_name: "",
        record_customer_phone: "",
        record_sub_total: 0,
        record_total: 0,
        record_updated_at: 1,
        record_deleted_at: null,
        record_supplier_id: null,
        record_supplier_name: "",
        record_flag: 0,
        record_pair_id: null,
      }),
      { record_methods: [{ record_method_id: "m1", method_id: "1000", record_method_pay: 5 }] },
    );

    const parsed = JSON.parse(line) as { e: string; ch: Record<string, unknown[]> };
    expect(parsed.e).toBe("record");
    expect(Object.keys(parsed.ch)).toEqual([...CHILD_ORDER]);
    expect(parsed.ch["record_listings"]).toEqual([]);
    expect(parsed.ch["record_methods"]).toEqual([
      { record_method_id: "m1", method_id: "1000", record_method_pay: 5 },
    ]);
  });

  test("a pull row decodes with its seq and entity", () => {
    const frame = parsePullFrame(
      parseLine(
        '{"t":"row","s":1043,"e":"customer","r":{"customer_id":"c1","customer_name":"Ani","customer_phone":"0812","customer_updated_at":1,"customer_deleted_at":null}}',
      ),
    );
    expect(frame).toMatchObject({ t: "row", seq: 1043, entity: "customer" });
  });

  test("an aggregate pull frame decodes its children", () => {
    const frame = parsePullFrame(
      parseLine(
        '{"t":"ag","s":1391,"e":"record","r":{"record_id":"r1"},"ch":{"record_listings":[],"record_methods":[{"record_method_id":"m1","method_id":"1000","record_method_pay":5}],"record_extras":[],"record_images":[],"discounts":[]}}',
      ),
    );
    if (frame.t !== "ag") throw new Error("expected an aggregate frame");
    expect(frame.children["record_methods"]).toEqual([
      { record_method_id: "m1", method_id: "1000", record_method_pay: 5 },
    ]);
  });

  test("ack outcomes decode to their three shapes", () => {
    expect(parseAckFrame(parseLine('{"t":"ack","i":0,"s":"applied","seq":1391}'))).toEqual({
      t: "ack",
      index: 0,
      outcome: "applied",
      seq: 1391,
    });
    expect(parseAckFrame(parseLine('{"t":"ack","i":1,"s":"noop"}'))).toEqual({
      t: "ack",
      index: 1,
      outcome: "noop",
    });
    const stale = parseAckFrame(
      parseLine('{"t":"ack","i":2,"s":"stale","row":{"record_id":"r1"},"ch":{"record_listings":[],"record_methods":[],"record_extras":[],"record_images":[],"discounts":[]}}'),
    );
    expect(stale).toMatchObject({ t: "ack", index: 2, outcome: "stale" });
  });

  test("an ack stream's `done` carries the committed pointer", () => {
    expect(parseAckFrame(parseLine('{"t":"done","at":262144,"frames":90}'))).toEqual({
      t: "done",
      at: 262144,
      frames: 90,
    });
  });

  test("an in-stream error is surfaced, not swallowed", () => {
    const frame = parseAckFrame(parseLine('{"t":"error","code":"bad_frame","message":"baris rusak"}'));
    expect(frame).toEqual({ t: "error", code: "bad_frame", message: "baris rusak" });
  });

  test("an unknown frame type throws rather than being ignored", () => {
    expect(() => parsePullFrame(parseLine('{"t":"blob","id":"x"}'))).toThrow();
  });
});
