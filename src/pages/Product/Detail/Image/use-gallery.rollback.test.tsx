import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Effect } from "effect";

/**
 * A rollback releases, it does not unlink.
 *
 * The two are not the same once a stored picture is named by its content
 * (`lib/image.ts`, `image_opt.rs::store_in`): the second row storing a picture
 * makes no file of its own, so `save` hands back the name the first row already
 * holds. A commit that fails then rolls back names it does not own, and an
 * `image.del` there blanks a product that saved correctly — the failure lands on
 * the wrong row, one the operator may never touch again.
 *
 * So what is asserted here is the *routing*: the rollback goes through
 * `image.release` (the refcount gate) and never through `image.del`. The
 * kept/deleted decision behind that gate is `services/image/live.test.ts`.
 *
 * `mock.module` registrations are not reliably scoped to the file that made them
 * (oven-sh/bun#31319 — also seen on the Windows runner), so every member of the
 * mocked modules is present and the registration is taken back on the way out
 * (see `hooks/use-image.test.tsx` for the same convention).
 */
const deleted: string[] = [];
const released: string[] = [];
const written: string[] = [];

mock.module("~/lib/image", () => ({
  image: {
    save: (_file: File, _fileKey: string, mime: string) => {
      // What the optimizer answers for content it has already stored: the name is
      // the hash of the bytes, so both drafts below land on one file.
      written.push("sha-content.webp");
      return Effect.succeed({ name: "sha-content.webp", mime });
    },
    del: (name: string) => {
      deleted.push(name);
      return Effect.succeed(undefined);
    },
    load: (name: string) => Effect.succeed(`blob:${name}`),
    size: () => Effect.succeed(0),
  },
}));

mock.module("~/services", () => ({
  service: {
    product: {
      set: {
        image: {
          // The commit is the failure under test: one transaction, so nothing of
          // ours is in the db when it throws.
          commit: () => Effect.fail({ message: "Gagal menyimpan gambar" }),
          reorder: () => Effect.succeed(undefined),
        },
      },
    },
    image: {
      release: (name: string) => {
        released.push(name);
        // "kept": another row still names this file, which is the whole point.
        return Effect.succeed("kept" as const);
      },
    },
  },
}));

const { useGallery } = await import("./use-gallery");

function file(name: string) {
  return new File(["x"], name, { type: "image/jpeg" });
}

describe("useGallery save rollback", () => {
  beforeEach(() => {
    deleted.length = 0;
    released.length = 0;
    written.length = 0;
    let n = 0;
    URL.createObjectURL = mock(() => `blob:test-${n++}`) as typeof URL.createObjectURL;
    URL.revokeObjectURL = mock(() => undefined) as typeof URL.revokeObjectURL;
  });

  afterAll(() => {
    mock.restore();
  });

  test("a failed commit releases the written names instead of unlinking them", async () => {
    const { result } = renderHook(() => useGallery("p1", []));

    act(() => {
      result.current.add([file("a.jpg")]);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(written).toEqual(["sha-content.webp"]);
    expect(released).toEqual(["sha-content.webp"]);
    expect(deleted).toEqual([]);
  });

  test("a name a previous row already holds survives the rollback", async () => {
    const { result } = renderHook(() => useGallery("p1", []));

    // The same picture picked twice: two drafts, one file, one name. Neither is
    // this form's to unlink, and `release` is what knows that.
    act(() => {
      result.current.add([file("a.jpg"), file("b.jpg")]);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(released).toEqual(["sha-content.webp", "sha-content.webp"]);
    expect(deleted).toEqual([]);
    // The drafts stay: a failed commit is retryable, and the files are still there.
    expect(result.current.drafts).toHaveLength(2);
  });
});
