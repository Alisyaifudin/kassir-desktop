import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import { Effect, Stream } from "effect";
import { Unauthenticated } from "~/lib/auth";
import type { User } from "~/services/auth";

/**
 * The session guard every authenticated screen reads. A signed-out app throws
 * `Unauthenticated`, which is the one error the router boundary turns into a
 * login redirect — so the failure mode matters as much as the happy path: a
 * missing user must never render as an empty shell.
 */
const ANI: User = { id: "c1", name: "Ani", role: "user" };
const ADMIN: User = { id: "c1", name: "Ani", role: "admin" };

let changes: Stream.Stream<User | null, unknown> = Stream.never;
let current: User | null = ANI;

mock.module("~/services", () => ({
  service: {
    auth: {
      get changes() {
        return changes;
      },
      get: () => Effect.succeed(current),
    },
  },
}));

const { useUser } = await import("./use-user");

beforeEach(() => {
  changes = Stream.never;
  current = ANI;
});

describe("useUser", () => {
  test("returns the persisted session", () => {
    // The stream never emits; the user comes from the seeded read.
    expect(renderHook(() => useUser()).result.current).toEqual(ANI);
  });

  test("follows a session change from the stream", async () => {
    changes = Stream.make(ADMIN);

    const { result } = renderHook(() => useUser());

    await waitFor(() => expect(result.current.role).toBe("admin"));
  });

  test("a signed-out app throws Unauthenticated instead of rendering", () => {
    current = null;
    // React reports the throw from the render; the assertion is the throw.
    const logged = spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useUser())).toThrow(Unauthenticated);

    logged.mockRestore();
  });
});
