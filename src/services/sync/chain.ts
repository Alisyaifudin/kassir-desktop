/**
 * The upload prefix hash chain (contract §7.3).
 *
 *   C_0 = EMPTY_CHAIN            (the empty string: concatenating it adds no bytes)
 *   C_n = hex(sha256(hex2bytes(C_{n-1}) || "\n" || line_bytes))
 *
 * The hash itself is computed in Rust (`sync_chain`), not here: `crypto.subtle`
 * depends on the webview build, while the chain is load-bearing for resume
 * verification. Only this anchor has to agree across the wire, and it has to agree
 * exactly — the server compares the header to the chain it stored, string for
 * string.
 *
 * ## C_0 is not sha256("")
 *
 * This file used to anchor at the digest of the empty string, on the reading that
 * "sha256 of nothing" meant `e3b0c442…`. The server anchors at *zero bytes*, so the
 * first chunk produced two different C_1s: the second chunk of any upload was
 * rejected as `replay_mismatch`, retried in a fresh session, diverged again, and
 * the push failed after three attempts. Single-chunk uploads passed, which is why
 * both test suites were green — each was consistent with itself.
 *
 * `chain.test.ts` now pins C_1 of a fixed line to a literal that is also pinned in
 * `kassir-backend/test/unit/chain.test.ts` and in `src-tauri/src/sync.rs`, so a
 * change of convention breaks a test instead of a shop.
 */

/** C_0: no bytes at all. */
export const EMPTY_CHAIN = "";
