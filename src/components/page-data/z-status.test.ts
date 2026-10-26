import { describe, expect, test } from "bun:test";
import { statusOf, statusOfGroup, type LooseState } from "./z-status";

/**
 * The one word a widget can read off a key's state. `stale` is the word the old
 * `Result` could not say — a value is on screen, the last refresh lost, nothing is
 * in flight — and it is deliberately not `failed`: working data keeps working.
 */
const init = { type: "init" } as const;
const ready = { type: "success", data: 1 } as const;
const refreshing = { type: "success", data: 1, refetching: true } as const;
const stale = { type: "success", data: 1, failure: "putus" } as const;
const failed = { type: "error", error: "putus" } as const;

describe("statusOf", () => {
  test("a key nothing has read yet is pending", () => {
    expect(statusOf(undefined)).toBe("pending");
    expect(statusOf(init)).toBe("pending");
  });

  test("a value with nothing wrong is ready", () => {
    expect(statusOf(ready)).toBe("ready");
  });

  test("a retry in flight outranks the failure it is retrying", () => {
    expect(statusOf(refreshing)).toBe("refreshing");
  });

  test("a value that survived a failed refresh is stale, not failed", () => {
    expect(statusOf(stale)).toBe("stale");
  });

  test("no value at all is failed", () => {
    expect(statusOf(failed)).toBe("failed");
  });
});

describe("statusOfGroup", () => {
  const state: LooseState = { a: ready, b: stale, c: init, d: refreshing, e: failed };

  test("reports the worst of the named keys, in order that matters", () => {
    expect(statusOfGroup(state, ["a", "b"])).toBe("stale");
    expect(statusOfGroup(state, ["a", "b", "d"])).toBe("refreshing");
    expect(statusOfGroup(state, ["a", "b", "d", "c"])).toBe("pending");
    expect(statusOfGroup(state, ["a", "b", "d", "c", "e"])).toBe("failed");
  });

  test("keys it was not asked about do not count", () => {
    // `e` is failed, but this widget only guards `a`.
    expect(statusOfGroup(state, ["a"])).toBe("ready");
  });

  test("a guarded key that was never read is pending", () => {
    expect(statusOfGroup(state, ["a", "never-read"])).toBe("pending");
  });

  test("no keys at all is ready", () => {
    expect(statusOfGroup(state, [])).toBe("ready");
  });
});
