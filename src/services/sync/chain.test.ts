import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { EMPTY_CHAIN } from "./chain";

/**
 * The chain anchor (contract §7.3).
 *
 * The hash is computed in Rust (`sync_chain`), so what this file pins is the one
 * thing the TS side contributes: `C_0`. It has to match the server byte for byte,
 * because the server compares the `Upload-Prefix-Sha256` header to the chain it
 * stored as a string.
 *
 * It did not match. The client anchored at sha256("") while the server anchored at
 * zero bytes, so the first chunk produced two different C_1s and the *second* chunk
 * of every upload was rejected as `replay_mismatch` — retried in a fresh session,
 * diverged again, failed. Single-chunk uploads passed, so both suites were green.
 *
 * `C1_OF_FIXED_LINE` is the same literal as in
 * `kassir-backend/test/unit/chain.test.ts` and in `src-tauri/src/sync.rs`.
 */

const LINE = '{"e":"product","r":{"product_id":"01J"}}';

/** C_1 for the line above, computed independently: sha256("\n" + line). */
const C1_OF_FIXED_LINE = "a966ed9adc7ab9fc58fb06b20622ffc5e270a25459a5cb2e3f6a8f4a06a1f3ea";

function step(prevHex: string, line: string): string {
  const prev = prevHex === "" ? Buffer.alloc(0) : Buffer.from(prevHex, "hex");
  return createHash("sha256").update(prev).update("\n").update(line, "utf8").digest("hex");
}

describe("the chain anchor", () => {
  test("C_0 is the empty string", () => {
    expect(EMPTY_CHAIN).toBe("");
  });

  test("the first step from C_0 hashes the line alone, not a digest", () => {
    expect(step(EMPTY_CHAIN, LINE)).toBe(C1_OF_FIXED_LINE);
  });

  test("anchoring at sha256('') gives a different chain — the bug this pins", () => {
    // Kept as the counter-example: if this ever equals C1_OF_FIXED_LINE, the two
    // conventions have collapsed into one and this file no longer guards anything.
    const digestOfNothing = createHash("sha256").update("").digest("hex");
    expect(step(digestOfNothing, LINE)).not.toBe(C1_OF_FIXED_LINE);
  });

  test("a chain advances once per line, in order", () => {
    const lines = [LINE, '{"e":"product","r":{"product_id":"01K"}}'];
    let chain = EMPTY_CHAIN;
    for (const line of lines) chain = step(chain, line);
    expect(chain).toBe(lines.reduce((prev, line) => step(prev, line), EMPTY_CHAIN));
    // Order matters, or the chain would not describe bytes.
    expect(step(step(EMPTY_CHAIN, lines[0]!), lines[1]!)).toBe(chain);
    expect(step(step(EMPTY_CHAIN, lines[1]!), lines[0]!)).not.toBe(chain);
  });
});
