/**
 * migration-61 — the records a mode flip left unsendable.
 *
 * The migration is SQL, so the only honest test is to run it against the real
 * schema (`makeTestDatabase` applies every migration). The rows below are the
 * shape the old `record.set.mode` left behind: the tombstone keeps nothing, the
 * replacement holds the children under the tombstone's primary keys, and the
 * record's journalled events were rewritten in place (sign flipped, owner moved).
 *
 * Run with:  bun test src/services/db/migration-61.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { makeTestDatabase } from "./test-support";

const REPAIR = readFileSync("src-tauri/src/database/61-70/migration-61.sql", "utf8");

const NOW = 1_790_000_000_000;

type Db = ReturnType<typeof makeTestDatabase>["db"];

function record(
  db: Db,
  id: string,
  input: {
    mode: "incoming" | "outcoming";
    createdAt: number;
    updatedAt: number;
    deletedAt: number | null;
    syncAt: number | null;
    total?: number;
    pairId?: string | null;
  },
): void {
  db.query(
    `INSERT INTO records (
        record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
        record_cashier, record_mode, record_pay, record_note, record_fix,
        record_customer_name, record_customer_phone, record_sub_total, record_total,
        record_updated_at, record_sync_at, record_deleted_at, record_flag, record_pair_id
      ) VALUES (?, ?, ?, 0, NULL, 'Ali', ?, ?, '', 0, '', '', ?, ?, ?, ?, ?, 0, ?)`,
  ).run(
    id,
    input.createdAt,
    input.createdAt,
    input.mode,
    input.total ?? 25_000,
    input.total ?? 25_000,
    input.total ?? 25_000,
    input.updatedAt,
    input.syncAt,
    input.deletedAt,
    input.pairId ?? null,
  );
}

function portion(
  db: Db,
  input: { id: string; recordId: string; eventId: string | null; name?: string },
): void {
  db.query(
    `INSERT INTO record_listings (
        record_listing_id, record_listing_group_id, record_id, product_event_id,
        product_id, record_listing_name, record_listing_kind, record_listing_unit,
        record_listing_price, record_listing_qty, record_listing_capital,
        record_listing_total
      ) VALUES (?, 'g1', ?, ?, 'p1', ?, 'retail', 1, 25000, 1, 1000, 25000)`,
  ).run(input.id, input.recordId, input.eventId, input.name ?? "Kopi");
}

function event(
  db: Db,
  input: { id: string; recordId: string | null; value: number; syncAt: number | null },
): void {
  db.query(
    `INSERT INTO product_events (
        product_event_id, product_event_created_at, product_event_sync_at,
        product_event_value, product_event_capital, product_event_note,
        product_id, stock_id, record_id
      ) VALUES (?, ?, ?, ?, 1000, '', 'p1', 's1', ?)`,
  ).run(input.id, NOW - 1_000, input.syncAt, input.value, input.recordId);
}

/** The shape the old flip left: `r_old` is a husk, `r_new` holds its children. */
function setup(): Db {
  const { db } = makeTestDatabase();
  db.exec(`
    INSERT INTO products (product_id, product_name, product_note, product_updated_at)
      VALUES ('p1', 'Kopi', '', 1);
    INSERT INTO methods (method_id, method_name, method_kind, method_updated_at)
      VALUES ('cash', 'Tunai', 'cash', 1);
    INSERT INTO stocks (
      stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
    ) VALUES ('s1', 'p1', 3, 1000, 1, 1);
  `);
  // The sale, pushed to the server while it was still a sale.
  event(db, { id: 'e1', recordId: 'r_old', value: -1, syncAt: 900 });
  // The flip: the tombstone keeps nothing, the copy owns the moved children, and
  // the event was rewritten in place — sign flipped, owner moved.
  record(db, "r_old", { mode: "incoming", createdAt: 1_000, updatedAt: NOW, deletedAt: NOW, syncAt: null });
  record(db, "r_new", { mode: "outcoming", createdAt: 1_000, updatedAt: NOW, deletedAt: null, syncAt: null });
  portion(db, { id: "rl_old", recordId: "r_new", eventId: "e1" });
  db.query(
    `UPDATE record_listings SET record_listing_id = 'rl_old' WHERE record_id = 'r_new'`,
  ).run();
  db.exec(`
    INSERT INTO discounts (
        discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff
      ) VALUES ('d1', 'dg1', 'rl_old', 'number', 500, 500);
    INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
      VALUES ('rm_old', 'r_new', 'cash', 25000);
    INSERT INTO record_extras (
        record_extra_id, record_extra_name, record_id, record_extra_value,
        record_extra_eff, record_extra_kind, record_extra_flag
      ) VALUES ('re_old', 'Ongkir', 'r_new', 0, 0, 'number', 0);
    INSERT INTO record_images (
        record_image_id, record_image_order, record_image_name, record_image_mime, record_id
      ) VALUES ('ri_old', 0, 'nota.png', 'image/png', 'r_new');
  `);
  db.query(`UPDATE product_events SET record_id = 'r_new', product_event_value = 1 WHERE product_event_id = 'e1'`).run();
  return db;
}

function only<T>(db: Db, sql: string, ...params: (string | number)[]): T {
  return db.query(sql).get(...params) as T;
}

describe("migration-61", () => {
  test("re-keys the replacement's children so no key is claimed twice", () => {
    const db = setup();
    db.exec(REPAIR);

    const moved = only<{ record_listing_id: string; product_event_id: string }>(
      db,
      "SELECT record_listing_id, product_event_id FROM record_listings WHERE record_id = 'r_new'",
    );
    expect(moved.record_listing_id).not.toBe("rl_old");
    expect(moved.record_listing_id).toHaveLength(26);
    // The tombstone's own key is free again, so a push can never carry it under
    // two record ids.
    expect(
      db.query("SELECT record_listing_id FROM record_listings WHERE record_listing_id = 'rl_old'").all(),
    ).toEqual([]);
    // The discount followed its listing and kept the group the page regroups by.
    expect(
      only<{ record_listing_id: string; discount_group_id: string }>(
        db,
        "SELECT record_listing_id, discount_group_id FROM discounts WHERE discount_id = 'd1'",
      ),
    ).toEqual({ record_listing_id: moved.record_listing_id, discount_group_id: "dg1" });

    for (const [table, column, old] of [
      ["record_methods", "record_method_id", "rm_old"],
      ["record_extras", "record_extra_id", "re_old"],
      ["record_images", "record_image_id", "ri_old"],
    ] as const) {
      const rows = db
        .query(`SELECT ${column} AS id FROM ${table} WHERE record_id = 'r_new'`)
        .all() as { id: string }[];
      expect(rows).toHaveLength(1);
      expect(rows[0]!.id).not.toBe(old);
    }
  });

  test("the journal is put back and compensated, never left half flipped", () => {
    const db = setup();
    db.exec(REPAIR);

    // The event the server already holds goes back to the shape it was stored
    // in: the tombstone's, at the pre-flip sign.
    expect(
      only<{ record_id: string; product_event_value: number; product_event_sync_at: number | null }>(
        db,
        "SELECT record_id, product_event_value, product_event_sync_at FROM product_events WHERE product_event_id = 'e1'",
      ),
    ).toEqual({ record_id: "r_old", product_event_value: -1, product_event_sync_at: 900 });

    // One compensation, unlinked and unsent: `-1` plus `+2` is what the flips on
    // the other tills are missing.
    const compensation = db
      .query(
        `SELECT product_event_value, record_id, product_event_sync_at, product_event_note
           FROM product_events WHERE product_event_id <> 'e1'`,
      )
      .all() as {
      product_event_value: number;
      record_id: string | null;
      product_event_sync_at: number | null;
      product_event_note: string;
    }[];
    expect(compensation).toHaveLength(1);
    expect(compensation[0]).toMatchObject({
      product_event_value: 2,
      record_id: null,
      product_event_sync_at: null,
      product_event_note: "Ubah mode",
    });
  });

  test("an event that never reached the server is left to travel as it is", () => {
    const db = setup();
    db.query("UPDATE product_events SET product_event_sync_at = NULL WHERE product_event_id = 'e1'").run();
    db.exec(REPAIR);

    // Nothing on the server to disagree with: the replacement keeps the movement
    // and pushes it, so no compensation is owed.
    expect(
      only<{ record_id: string | null; product_event_value: number }>(
        db,
        "SELECT record_id, product_event_value FROM product_events WHERE product_event_id = 'e1'",
      ),
    ).toEqual({ record_id: "r_new", product_event_value: 1 });
    expect(db.query("SELECT product_event_id FROM product_events").all()).toHaveLength(1);
  });

  test("both rows go back on the queue and the pair cannot match again", () => {
    const db = setup();
    db.exec(REPAIR);

    expect(
      only<{ record_sync_at: number | null }>(
        db,
        "SELECT record_sync_at FROM records WHERE record_id = 'r_new'",
      ).record_sync_at,
    ).toBeNull();
    expect(
      only<{ record_sync_at: number | null }>(
        db,
        "SELECT record_sync_at FROM records WHERE record_id = 'r_old'",
      ).record_sync_at,
    ).toBeNull();
    expect(
      only<{ record_updated_at: number }>(
        db,
        "SELECT record_updated_at FROM records WHERE record_id = 'r_new'",
      ).record_updated_at,
    ).toBeGreaterThan(NOW);
  });

  test("a second run changes nothing", () => {
    const db = setup();
    db.exec(REPAIR);
    const listings = db.query("SELECT * FROM record_listings ORDER BY record_listing_id").all();
    const events = db.query("SELECT product_event_id, product_event_value, record_id FROM product_events ORDER BY product_event_id").all();
    const records = db.query("SELECT record_id, record_updated_at FROM records ORDER BY record_id").all();

    db.exec(REPAIR);

    expect(db.query("SELECT * FROM record_listings ORDER BY record_listing_id").all()).toEqual(listings);
    expect(
      db.query("SELECT product_event_id, product_event_value, record_id FROM product_events ORDER BY product_event_id").all(),
    ).toEqual(events);
    expect(db.query("SELECT record_id, record_updated_at FROM records ORDER BY record_id").all()).toEqual(records);
  });

  test("an ordinary delete is not mistaken for a flip", () => {
    const db = makeTestDatabase().db;
    db.exec(`
      INSERT INTO products (product_id, product_name, product_note, product_updated_at)
        VALUES ('p1', 'Kopi', '', 1);
    `);
    // A deleted record that kept its children, and an unrelated live record in
    // the other mode — same creation date, same clock, but paired and with its
    // own children. That is a correction, not a flip.
    record(db, "r_a", { mode: "incoming", createdAt: 1_000, updatedAt: NOW, deletedAt: NOW, syncAt: null, pairId: "r_b" });
    record(db, "r_b", { mode: "outcoming", createdAt: 1_000, updatedAt: NOW, deletedAt: null, syncAt: 42, pairId: "r_a" });
    portion(db, { id: "rl_a", recordId: "r_a", eventId: null });
    portion(db, { id: "rl_b", recordId: "r_b", eventId: null });

    db.exec(REPAIR);

    expect(
      db.query("SELECT record_listing_id FROM record_listings ORDER BY record_listing_id").all(),
    ).toEqual([{ record_listing_id: "rl_a" }, { record_listing_id: "rl_b" }]);
    expect(
      only<{ record_sync_at: number | null }>(
        db,
        "SELECT record_sync_at FROM records WHERE record_id = 'r_b'",
      ).record_sync_at,
    ).toBe(42);
  });
});
