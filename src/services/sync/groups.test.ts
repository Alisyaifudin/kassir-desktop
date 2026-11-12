/**
 * Guards the one list that must agree across the webview/Rust boundary.
 *
 * `SYNC_GROUPS` decides which groups a full cycle visits, and `GROUPS` in
 * `sync.rs` decides which ones the shipped transport will put in a `/v2/` path.
 * The combo group was added to the first but not the second: every real run then
 * failed with `bad_group`, while the sync suite stayed green because it injects
 * a fake transport with no whitelist. This test reads the Rust source so that
 * drift cannot hide behind the fake again.
 *
 * Run with:  bun test src/services/sync/groups.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SYNC_GROUPS } from "./schema";

const RUST_TRANSPORT = join(process.cwd(), "src-tauri/src/sync.rs");

/** The group names in the order Rust declares them. */
function rustGroups(): { declared: number; names: string[] } {
  const source = readFileSync(RUST_TRANSPORT, "utf8");
  const block = /const\s+GROUPS:\s*\[&str;\s*(\d+)\]\s*=\s*\[([\s\S]*?)\];/.exec(source);
  if (block === null) throw new Error("sync.rs no longer declares a GROUPS array");
  const declared = Number(block[1]);
  const names = [...(block[2] ?? "").matchAll(/"([a-z_]+)"/g)].map((match) => match[1]!);
  return { declared, names };
}

describe("the shipped transport accepts every group the cycle visits", () => {
  test("Rust's whitelist is exactly SYNC_GROUPS, in the same order", () => {
    const { names } = rustGroups();
    expect(names).toEqual([...SYNC_GROUPS]);
  });

  test("the array length is not left at the old count", () => {
    const { declared, names } = rustGroups();
    expect(declared).toBe(names.length);
    expect(declared).toBe(SYNC_GROUPS.length);
  });
});
