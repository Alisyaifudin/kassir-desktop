import type { Result } from "~/components/Loader";

/** A key's state with the types erased, for code that does not care which key. */
export type LooseResult = Result<unknown, unknown>;
export type LooseState = Record<string, LooseResult>;

/**
 * One readable word per key state.
 *
 * `stale` is the one the old `Result` could not say: a value is on screen, the
 * last refresh lost, and nothing is in flight. It is deliberately *not* an error
 * — a widget that keeps working data keeps working data — but a widget that wants
 * to confess reads this and says so.
 */
export type PageDataStatus = "pending" | "ready" | "refreshing" | "failed" | "stale";

export function statusOf(res: LooseResult | undefined): PageDataStatus {
  if (res === undefined || res.type === "init") return "pending";
  if (res.type === "error") return "failed";
  // A retry in flight outranks an older failure: it is being answered right now.
  if (res.refetching === true) return "refreshing";
  if (res.failure !== undefined) return "stale";
  return "ready";
}

/** The word for a *set* of keys: the worst of them, in the order that matters. */
export function statusOfGroup(state: LooseState, keys: readonly string[]): PageDataStatus {
  const words = keys.map((key) => statusOf(state[key]));
  if (words.includes("failed")) return "failed";
  if (words.includes("pending")) return "pending";
  if (words.includes("refreshing")) return "refreshing";
  if (words.includes("stale")) return "stale";
  return "ready";
}
