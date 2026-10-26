import { beforeEach, describe, expect, mock, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { Effect, Stream } from "effect";
import type { Size } from "~/services/config";

/**
 * The UI size the whole layout is built from. Two behaviours matter: the first
 * render already holds the persisted value (a `big` flash then a snap to `small`
 * is visible on every launch), and a config stream that dies falls back to `big`
 * rather than to `undefined`.
 */
let changes: Stream.Stream<Size, unknown> = Stream.never;
let persisted: Size = "small";

mock.module("~/services", () => ({
  service: {
    config: {
      size: {
        get changes() {
          return changes;
        },
        get: () => Effect.succeed(persisted),
      },
    },
  },
}));

const { useSize } = await import("./use-size");

beforeEach(() => {
  changes = Stream.never;
  persisted = "small";
});

describe("useSize", () => {
  test("the first render already has the persisted size", () => {
    // `Stream.never` never emits, so this can only come from the seeded read.
    expect(renderHook(() => useSize()).result.current).toBe("small");
  });

  test("follows a size change from the stream", async () => {
    changes = Stream.make("big" as Size);

    const { result } = renderHook(() => useSize());

    await waitFor(() => expect(result.current).toBe("big"));
  });

  test("a config stream that fails falls back to big, not undefined", async () => {
    changes = Stream.fail(new Error("store rusak"));

    const { result } = renderHook(() => useSize());
    // The seed is shown first, then the failure replaces it with the default.
    expect(result.current).toBe("small");

    await waitFor(() => expect(result.current).toBe("big"));
  });
});
