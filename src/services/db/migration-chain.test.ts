/**
 * Guards the migration chain the app ships.
 *
 * sqlx fingerprints every migration it applies: `tauri_plugin_sql` runs a
 * `sqlx::migrate::Migrator` over `sqlite:data.db` at preload time and compares
 * the rows in `_sqlx_migrations` with the set compiled into the binary. A
 * changed byte in an already-shipped file is `VersionMismatch`, a version the
 * database recorded but the build no longer carries is `VersionMissing` — and
 * either one means an existing install cannot open its database at all.
 *
 * So the rule is the one this test enforces: **a migration that has shipped is
 * immutable, and versions are contiguous**. Adding schema work means appending
 * `migration-<N+1>.sql`, registering it in `src-tauri/src/database/mod.rs` and
 * pinning its checksum in `migration-checksums.json`; it never means editing an
 * existing file — however tempting folding two files together looks.
 *
 * The one recorded exception: the 43-53 chain was re-baselined to 43 + 44
 * (folding 45-53 in, and adding `records.record_flag`) when the shop's database
 * was deliberately reset, so the pinned set stops at 44. From here the rule
 * holds again: 43 and 44 are shipped now too.
 *
 * Run with:  bun test src/services/db/migration-chain.test.ts
 */
import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

const ROOT = process.cwd();
const DB_DIR = "src-tauri/src/database";
const MOD_RS = join(DB_DIR, "mod.rs");
const PINNED = join(DB_DIR, "migration-checksums.json");

type Registered = { version: number; path: string };

/** `version: N,` followed (possibly a few lines later) by `include_str!("…")`. */
function registered(): Registered[] {
  const source = readFileSync(join(ROOT, MOD_RS), "utf8");
  const out: Registered[] = [];
  const block = /version:\s*(\d+)[\s\S]*?include_str!\("([^"]+)"\)/g;
  for (const match of source.matchAll(block)) {
    const version = Number(match[1]);
    const sql = match[2];
    if (sql === undefined) continue;
    out.push({ version, path: normalize(join(dirname(MOD_RS), sql)) });
  }
  return out;
}

function onDisk(): { version: number; path: string }[] {
  const files = [...new Glob(`${DB_DIR}/**/migration-*.sql`).scanSync(ROOT)];
  return files
    .map((path) => ({
      version: Number(path.match(/migration-(\d+)\.sql/)?.[1] ?? 0),
      path: normalize(path),
    }))
    .sort((a, b) => a.version - b.version);
}

function checksum(path: string): string {
  return (
    "sha384:" +
    createHash("sha384")
      .update(readFileSync(join(ROOT, path)))
      .digest("hex")
  );
}

describe("shipped migration chain", () => {
  test("generate_migration() registers every file on disk, contiguously from 1", () => {
    const shipped = registered();
    const files = onDisk();

    expect(shipped.map((entry) => entry.version)).toEqual(files.map((entry) => entry.version));
    expect(shipped.map((entry) => entry.version)).toEqual(
      Array.from({ length: files.length }, (_, index) => index + 1),
    );
    expect(shipped.length).toBeGreaterThan(0);
  });

  test("every include_str! target exists", () => {
    for (const entry of registered()) {
      expect({ path: entry.path, exists: existsSync(join(ROOT, entry.path)) }).toEqual({
        path: entry.path,
        exists: true,
      });
    }
  });

  test("the file name matches the registered version", () => {
    for (const entry of registered()) {
      const name = relative(DB_DIR, entry.path);
      expect({ name, version: entry.version }).toEqual({
        name,
        version: Number(entry.path.match(/migration-(\d+)\.sql/)?.[1] ?? 0),
      });
    }
  });

  test("no shipped migration has been edited (checksums are pinned)", () => {
    const pinned = JSON.parse(readFileSync(join(ROOT, PINNED), "utf8")) as Record<string, string>;
    const actual: Record<string, string> = {};
    for (const entry of onDisk()) actual[String(entry.version)] = checksum(entry.path);

    expect(actual).toEqual(pinned);
  });
});
