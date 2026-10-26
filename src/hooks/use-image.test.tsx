import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Effect } from "effect";

/**
 * A product image is a file on disk resolved to an object URL while the screen is
 * mounted. Two lifetimes here are money: the blob must be released when the
 * screen goes away (a POS is never closed), and a load that finishes *after*
 * unmount must release its own URL instead of setting state on a dead component.
 */
type Load = { name: string; mime: string };

const loads: Load[] = [];
let mode: "ok" | "fail" | "pending" = "ok";
let resolvePending: ((url: string) => void) | null = null;

mock.module("~/lib/image", () => ({
  image: {
    load: (name: string, mime: string) => {
      loads.push({ name, mime });
      if (mode === "fail") return Effect.fail(new Error("Gagal membaca gambar"));
      if (mode === "pending") {
        return Effect.promise(
          () =>
            new Promise<string>((resolve) => {
              resolvePending = resolve;
            }),
        );
      }
      return Effect.succeed(`blob:${name}`);
    },
  },
}));

const { useImageUrl } = await import("./use-image");

const revoked: string[] = [];
const originalRevoke = URL.revokeObjectURL;
URL.revokeObjectURL = (url: string) => {
  revoked.push(url);
};

beforeEach(() => {
  loads.length = 0;
  revoked.length = 0;
  mode = "ok";
  resolvePending = null;
});

afterAll(() => {
  URL.revokeObjectURL = originalRevoke;
});

describe("useImageUrl", () => {
  test("no image means no url and no disk read", () => {
    const { result } = renderHook(() => useImageUrl(null, null));

    expect(result.current).toBeNull();
    expect(loads).toEqual([]);
  });

  test("a missing name or mime short-circuits", () => {
    const noName = renderHook(() => useImageUrl(null, "image/png"));
    const noMime = renderHook(() => useImageUrl("a.png", null));

    expect(noName.result.current).toBeNull();
    expect(noMime.result.current).toBeNull();
    expect(loads).toEqual([]);
  });

  test("resolves the stored file to an object url", async () => {
    const { result } = renderHook(() => useImageUrl("a.png", "image/png"));

    await waitFor(() => expect(result.current).toBe("blob:a.png"));
    expect(loads).toEqual([{ name: "a.png", mime: "image/png" }]);
  });

  test("a failed read leaves the placeholder empty", async () => {
    mode = "fail";
    const { result } = renderHook(() => useImageUrl("a.png", "image/png"));

    await waitFor(() => expect(result.current).toBeNull());
    expect(revoked).toEqual([]);
  });

  test("a different image loads its own file", async () => {
    const { result, rerender } = renderHook(({ name }) => useImageUrl(name, "image/png"), {
      initialProps: { name: "a.png" },
    });
    await waitFor(() => expect(result.current).toBe("blob:a.png"));

    rerender({ name: "b.png" });

    await waitFor(() => expect(result.current).toBe("blob:b.png"));
    expect(loads.map((load) => load.name)).toEqual(["a.png", "b.png"]);
  });

  test("unmounting releases the object url", async () => {
    const { result, unmount } = renderHook(() => useImageUrl("a.png", "image/png"));
    await waitFor(() => expect(result.current).toBe("blob:a.png"));

    unmount();

    expect(revoked).toEqual(["blob:a.png"]);
  });

  test("a load that lands after unmount releases its url instead of setting state", async () => {
    mode = "pending";
    const { unmount } = renderHook(() => useImageUrl("late.png", "image/png"));
    unmount();

    await act(async () => {
      resolvePending?.("blob:late");
    });

    expect(revoked).toEqual(["blob:late"]);
  });
});
