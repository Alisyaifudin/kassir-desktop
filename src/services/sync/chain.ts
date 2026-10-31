/**
 * The upload prefix hash chain (contract §7.3).
 *
 *   C_0 = EMPTY_CHAIN
 *   C_n = hex(sha256(hex2bytes(C_{n-1}) || "\n" || line_bytes))
 *
 * The contract writes `C_0 = ""` and then glosses it as "sha256 of nothing, defined
 * as e3b0c442…". A truly empty header value is not useful to a server that compares
 * strings, so the digest of the empty string is the anchor. This constant is the
 * client's half of that agreement, and `src-tauri/src/sync.rs` carries the same
 * value; if the backend settles on the other reading, both move together.
 *
 * The hash itself is computed in Rust (`sync_chain`), not here: `crypto.subtle`
 * depends on the webview build, while the chain is load-bearing for resume
 * verification. Both sides of the wire therefore hash with the same
 * implementation, and only this constant needs to agree.
 */

/** sha256("") — the chain's anchor (§7.3). */
export const EMPTY_CHAIN =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
