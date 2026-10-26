import { beforeEach, describe, expect, mock, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { Stream } from "effect";

/**
 * The record service's write counter, used as a query dependency: every commit,
 * delete and credit settle bumps it so a day-scoped read re-runs. The seed
 * matters — a hook that starts at `undefined` would key the first render
 * differently from the second and refetch for no reason.
 */
let revision: Stream.Stream<number, unknown> = Stream.never;

mock.module("~/services", () => ({
  service: {
    record: {
      get: {
        get revision() {
          return revision;
        },
      },
    },
  },
}));

const { useRecordRevision } = await import("./use-record-revision");

beforeEach(() => {
  revision = Stream.never;
});

describe("useRecordRevision", () => {
  test("the first render already holds a stable 0", () => {
    // `Stream.never` never emits, so the returned value can only be the seed.
    const { result } = renderHook(() => useRecordRevision());
    expect(result.current).toBe(0);
  });

  test("reports the counter the service streams", async () => {
    revision = Stream.make(7);

    const { result } = renderHook(() => useRecordRevision());

    await waitFor(() => expect(result.current).toBe(7));
  });

  test("follows a later bump", async () => {
    revision = Stream.concat(Stream.make(1), Stream.make(2));

    const { result } = renderHook(() => useRecordRevision());

    await waitFor(() => expect(result.current).toBe(2));
  });
});
