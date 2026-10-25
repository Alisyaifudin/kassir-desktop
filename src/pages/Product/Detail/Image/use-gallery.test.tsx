import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useGallery } from "./use-gallery";

/**
 * A picked image is a `File` in memory plus a `blob:` URL for the strip and the
 * preview. Those URLs were released only by discard and save — both reachable
 * only while the page is mounted — so navigating away with unsaved drafts (up to
 * ten files, 50 MB) pinned the blobs for the rest of the session, and a POS is
 * never closed between shifts.
 */
const created: string[] = [];
const revoked: string[] = [];

function file(name: string) {
  return new File(["x"], name, { type: "image/jpeg" });
}

describe("useGallery draft lifetimes", () => {
  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    let n = 0;
    URL.createObjectURL = mock(() => {
      const url = `blob:test-${n++}`;
      created.push(url);
      return url;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = mock((url: string) => {
      revoked.push(url);
    }) as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    // Leave the globals as the harness set them for the next file.
  });

  test("leaving the page releases every unsaved draft", () => {
    const { result, unmount } = renderHook(() => useGallery("p1", []));

    act(() => {
      result.current.add([file("a.jpg"), file("b.jpg"), file("c.jpg")]);
    });

    expect(created).toHaveLength(3);
    expect(revoked).toHaveLength(0);

    unmount();

    expect(revoked.sort()).toEqual([...created].sort());
  });

  test("discarding one draft still releases exactly its own url", () => {
    const { result } = renderHook(() => useGallery("p1", []));

    act(() => {
      result.current.add([file("a.jpg"), file("b.jpg")]);
    });

    const [first] = result.current.drafts;
    act(() => {
      result.current.discard(first!);
    });

    expect(revoked).toEqual([first!.href]);
  });
});
