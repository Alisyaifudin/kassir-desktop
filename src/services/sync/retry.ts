/**
 * The retry policy every request shares (`SYNC-V2.md` §4.11).
 *
 * Every frame and every page is idempotent, so the rule is uniform and the client
 * needs no bookkeeping: a failed request is simply asked again, and the answer is
 * `noop`/`stale` at worst. The numbers are fixed here so two clients do not invent
 * two policies.
 */
import type { SyncError } from ".";

/** Base and cap of the exponential backoff (§4.11). */
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 60_000;

/**
 * True when the failure is worth re-sending the same request for.
 *
 * `0` is a transport failure (no response), `408` a timeout and `>= 500` a server
 * or proxy fault. A `4xx` is a decision, not a hiccup: retrying it would loop.
 */
export function isRetryable(error: SyncError): boolean {
  const status = error.status ?? 0;
  return status === 0 || status === 408 || status >= 500;
}

/** `random(0, min(cap, base * 2^attempt))` — exponential with full jitter. */
export function backoffMs(attempt: number): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
  return Math.floor(Math.random() * ceiling);
}
