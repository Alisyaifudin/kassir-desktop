/**
 * migration-54 — the sales' cost, repaired from the purchase side.
 *
 * The migration is SQL, so the only honest test is to run it: the schema is the
 * real one (`makeTestDatabase` applies every migration), the rows below are the
 * shape v1 left behind — a sale whose `record_listing_capital` is exactly its
 * price — and the file is executed a second time to prove it is idempotent.
 *
 * Run with:  bun test src/services/db/migration-54.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { makeTestDatabase } from "./test-support";

const REPAIR = readFileSync("src-tauri/src/database/51-60/migration-54.sql", "utf8");

const DAY = 86_400_000;
const NOW = 1_790_000_000_000;

function setup() {
  const { db } = makeTestDatabase();
  // Two products: Kopi is bought and then sold (repairable), Teh is only sold
  // (nothing to repair from, so it keeps its row and the page estimates it).
  db.exec(`
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1), ('p2', 'Teh', '', 1);
    INSERT INTO listings (
      listing_id, product_id, listing_name, listing_price, listing_unit,
      listing_kind, listing_updated_at
    ) VALUES ('l1', 'p1', 'Kopi', 30000, 1, 'retail', 1),
             ('l2', 'p2', 'Teh', 15000, 1, 'retail', 1);

    -- r1: a purchase of 4 pcs at 20.000 → a real cost of 20.000 per pc.
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r1', ${NOW - 10 * DAY}, ${NOW - 10 * DAY}, 0, NULL, 'Ali', 'outcoming', 80000, '', 0,
      '', '', 80000, 80000, ${NOW - 10 * DAY}, NULL, NULL, 0);
    -- r2: a sale of 2 pcs at 30.000, whose "cost" was copied from the price.
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r2', ${NOW}, ${NOW}, 0, NULL, 'Ali', 'incoming', 60000, '', 0,
      '', '', 60000, 60000, ${NOW}, NULL, NULL, 0);
    -- r3: a sale of a product that was never bought.
    INSERT INTO records (
      record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
      record_cashier, record_mode, record_pay, record_note, record_fix,
      record_customer_name, record_customer_phone, record_sub_total, record_total,
      record_updated_at, record_sync_at, record_deleted_at, record_flag
    ) VALUES ('r3', ${NOW}, ${NOW}, 0, NULL, 'Ali', 'incoming', 15000, '', 0,
      '', '', 15000, 15000, ${NOW}, NULL, NULL, 0);

    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 2, 30000, ${NOW - 10 * DAY}, ${NOW});

    INSERT INTO product_events (
      product_event_id, product_event_created_at, product_event_sync_at,
      product_event_value, product_event_capital, product_event_note,
      product_id, stock_id, record_id
    ) VALUES ('e1', ${NOW - 10 * DAY}, NULL, 4, 20000, '', 'p1', 's1', 'r1'),
             ('e2', ${NOW}, NULL, -2, 30000, '', 'p1', 's1', 'r2'),
             ('e3', ${NOW}, NULL, -1, 15000, '', 'p2', 's2', 'r3');

    INSERT INTO record_listings (
      record_listing_id, record_listing_group_id, record_id, product_event_id,
      product_id, record_listing_name, record_listing_kind, record_listing_unit,
      record_listing_price, record_listing_qty, record_listing_capital,
      record_listing_total
    ) VALUES
      -- the purchase: capital is its own cost, and stays
      ('rl1', 'g1', 'r1', 'e1', 'p1', 'Kopi', 'retail', 1, 20000, 4, 20000, 80000),
      -- the sale: the copy to repair (4 pcs at 20.000 from the purchase)
      ('rl2', 'g2', 'r2', 'e2', 'p1', 'Kopi', 'retail', 1, 30000, 2, 30000, 60000),
      -- never purchased: nothing to repair from
      ('rl3', 'g3', 'r3', 'e3', 'p2', 'Teh', 'retail', 1, 15000, 1, 15000, 15000);
  `);
  return db;
}

type Line = { record_listing_capital: number };
type Event = { product_event_capital: number };
type Lot = { stock_capital: number };

function line(db: ReturnType<typeof setup>, id: string): number {
  return (db.query("SELECT record_listing_capital FROM record_listings WHERE record_listing_id = ?")
    .get(id) as Line).record_listing_capital;
}

function event(db: ReturnType<typeof setup>, id: string): number {
  return (db.query("SELECT product_event_capital FROM product_events WHERE product_event_id = ?")
    .get(id) as Event).product_event_capital;
}

function lot(db: ReturnType<typeof setup>, id: string): number {
  return (db.query("SELECT stock_capital FROM stocks WHERE stock_id = ?").get(id) as Lot).stock_capital;
}

describe("migration-54", () => {
  test("gives a sale the cost of the purchase it came from", () => {
    const db = setup();
    db.exec(REPAIR);

    // The purchase's 20.000 per pc, not the 30.000 the line sold for: the margin
    // the Profit page reads is 60.000 − 40.000 again.
    expect(line(db, "rl2")).toBe(20000);
    // The journal event for that movement carries the same snapshot…
    expect(event(db, "e2")).toBe(20000);
    // …and the lot the next sale drains from is folded to the journal, so the
    // next sale inherits a real cost instead of the price again.
    expect(lot(db, "s1")).toBe(20000);
  });

  test("leaves a purchase's own cost, and a product that was never bought, alone", () => {
    const db = setup();
    db.exec(REPAIR);

    expect(line(db, "rl1")).toBe(20000);
    expect(event(db, "e1")).toBe(20000);
    // No purchase to reconstruct from: the row keeps what it had, and the page
    // estimates it rather than this migration inventing a number.
    expect(line(db, "rl3")).toBe(15000);
    expect(event(db, "e3")).toBe(15000);
  });

  test("a second run changes nothing", () => {
    const db = setup();
    db.exec(REPAIR);
    const once = db.query("SELECT * FROM record_listings ORDER BY record_listing_id").all();
    const events = db.query("SELECT * FROM product_events ORDER BY product_event_id").all();
    const lots = db.query("SELECT * FROM stocks ORDER BY stock_id").all();

    db.exec(REPAIR);

    expect(db.query("SELECT * FROM record_listings ORDER BY record_listing_id").all()).toEqual(once);
    expect(db.query("SELECT * FROM product_events ORDER BY product_event_id").all()).toEqual(events);
    expect(db.query("SELECT * FROM stocks ORDER BY stock_id").all()).toEqual(lots);
  });

  test("a line with no cost at all is left for the page to estimate", () => {
    const db = setup();
    db.exec(`
      INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag
      ) VALUES ('r4', ${NOW}, ${NOW}, 0, NULL, 'Ali', 'incoming', 30000, '', 0,
        '', '', 30000, 30000, ${NOW}, NULL, NULL, 0);
      INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES ('rl4', 'g4', 'r4', NULL, 'p1', 'Kopi', 'retail', 1, 30000, 1, 0, 30000);
    `);

    db.exec(REPAIR);

    // Zero is "not recorded", not a copy of the price: `MarginEstimate` owns that
    // line, and a migration that filled it in would hide a real gap.
    expect(line(db, "rl4")).toBe(0);
  });
});
