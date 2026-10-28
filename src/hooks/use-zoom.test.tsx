import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Effect, Stream } from "effect";
import type { Zoom } from "~/services/zoom";

/**
 * The interface scale as the Setting control sees it. Three behaviours matter:
 * the first render already holds the stored level (a 100% flash before the
 * boot-time apply lands would defeat the point of applying at boot), a change
 * moves the control at once instead of waiting for the round trip, and a change
 * the webview refuses puts the thumb back on the level the app is really at.
 */
let changes: Stream.Stream<Zoom, unknown> = Stream.never;
let stored: Zoom = 1.5;
let refused = false;
const calls: Zoom[] = [];

const set = mock((zoom: Zoom) => {
  if (refused) return Effect.fail({ _tag: "ZoomError", message: "ditolak" });
  calls.push(zoom);
  return Effect.succeed(undefined);
});

mock.module("~/services", () => ({
  service: {
    zoom: {
      get changes() {
        return changes;
      },
      get: () => Effect.succeed(stored),
      set,
    },
  },
}));

const { useZoom } = await import("./use-zoom");

beforeEach(() => {
  changes = Stream.never;
  stored = 1.5;
  refused = false;
  calls.length = 0;
});

describe("useZoom", () => {
  test("the first render already has the stored level", () => {
    // `Stream.never` never emits, so this can only come from the seeded read.
    expect(renderHook(() => useZoom()).result.current.zoom).toBe(1.5);
  });

  test("a change moves the control immediately and writes it through", async () => {
    const { result } = renderHook(() => useZoom());

    act(() => {
      void result.current.change(1.75);
    });
    // The thumb has moved before the webview answered.
    expect(result.current.zoom).toBe(1.75);

    await act(async () => {});
    expect(calls).toEqual([1.75]);
  });

  test("a change the webview refuses is rolled back to the stored level", async () => {
    refused = true;
    const { result } = renderHook(() => useZoom());

    act(() => {
      void result.current.change(1.75);
    });
    await act(async () => {});

    expect(result.current.zoom).toBe(1.5);
    expect(result.current.error).not.toBeNull();
  });

  test("follows a level change from another writer", async () => {
    changes = Stream.make(1.75 as Zoom);

    const { result } = renderHook(() => useZoom());

    await waitFor(() => expect(result.current.zoom).toBe(1.75));
  });

  test("a service stream that fails falls back to 100%, not undefined", async () => {
    changes = Stream.fail(new Error("webview hilang"));

    const { result } = renderHook(() => useZoom());
    expect(result.current.zoom).toBe(1.5);

    await waitFor(() => expect(result.current.zoom).toBe(1));
  });
});
