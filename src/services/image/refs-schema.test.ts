import { describe, expect, test } from "bun:test";
import { makeTestDatabase } from "../db/test-support";
import REFS_FILE from "./refs.sql?raw";

/**
 * `refs.sql` is the single definition of "who names this file", and the four
 * tables in it are the whole of that answer — the product gallery, the pictures a
 * submitted record keeps, the ones attached to an open cart, and a combo's cover.
 *
 * Its one failure mode is arithmetic: the day a fifth table starts naming a file,
 * every count silently becomes an undercount, and an undercount is a permission to
 * unlink a picture another row still shows. Nothing in the app would say so — the
 * delete would simply take the wrong file. These two tests are what says so.
 *
 * The first is driven by the schema, so a new table is caught the moment its
 * migration lands, without anyone remembering this file exists. The second pins
 * `refs.sql` itself, including the tombstone rules that are easy to drop with a
 * tidy-up: `images` and `combos` keep tombstones forever, `record_images` inherits
 * its parent's, and a tombstone that owned bytes would mean the catalogue never
 * frees one.
 *
 * The schema test can only see what it is told to look for, so the convention is
 * part of the contract: **a column that names a file is called `*image_name` or
 * `*cover_name`.** A table that invents `logo_path` would slip past it — name the
 * column to be seen, or add it to `OWNERS` and to `refs.sql` together.
 */
const OWNERS = [
  "combos.combo_cover_name",
  "images.image_name",
  "record_images.record_image_name",
  "tx_images.tx_image_name",
];

/** The tombstone guard each table needs (and the ones that need none). */
const GUARDS: Record<string, string | null> = {
  images: "image_deleted_at",
  combos: "combo_deleted_at",
  // The one guard that lives on a parent: `record_images` has no tombstone of its
  // own, so a voided sale is recognised through `records`.
  record_images: "records.record_deleted_at",
  tx_images: null,
};

/** `table.column` for every column the schema calls a file name. */
function fromSchema() {
  const { db } = makeTestDatabase();
  const rows = db
    .query(
      `SELECT m.name || '.' || p.name AS name
         FROM sqlite_master m
         JOIN pragma_table_info(m.name) p
        WHERE m.type = 'table'
          AND (p.name LIKE '%image_name' OR p.name LIKE '%cover_name')
        ORDER BY 1`,
    )
    .all() as { name: string }[];
  return rows.map((row) => row.name);
}

type Counted = { table: string; column: string; guard: string | null };

/** Every `FROM table ... WHERE column = $1 [AND guard IS NULL]` in `refs.sql`. */
function fromRefs() {
  const pattern =
    /FROM\s+(\w+)\b[\s\S]*?WHERE\s+(\w+)\s*=\s*\$1(?:\s+AND\s+([\w.]+)\s+IS\s+NULL)?/gi;
  const counted: Counted[] = [];
  for (const match of REFS_FILE.matchAll(pattern)) {
    counted.push({ table: match[1]!, column: match[2]!, guard: match[3] ?? null });
  }
  return counted;
}

describe("the refcount covers every table that names a file", () => {
  test("the schema names no file column refs.sql does not count", () => {
    // A fifth table here is not a style problem: it is a file the delete paths
    // believe nobody owns.
    expect(fromSchema()).toEqual(OWNERS);
  });

  test("refs.sql counts exactly those four, with their tombstone rule", () => {
    const counted = fromRefs();

    expect(counted.map((row) => `${row.table}.${row.column}`).sort()).toEqual([...OWNERS].sort());
    // A dropped `AND <deleted>_at IS NULL` keeps the count looking right on the
    // happy path and frees every soft-deleted row's file forever.
    expect(Object.fromEntries(counted.map((row) => [row.table, row.guard]))).toEqual(GUARDS);
  });
});
