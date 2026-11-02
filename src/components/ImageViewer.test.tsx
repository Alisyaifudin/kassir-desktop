import { afterAll, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect } from "effect";

/**
 * A product's photos: the big frame follows the strip, and neither can get ahead
 * of what the product actually has.
 *
 * The bytes are files on disk, so every test here stubs `~/lib/image`; the whole
 * module is stubbed (not just `load`) because a `mock.module` registration is not
 * reliably scoped to the file that made it — see the longer note in
 * `~/hooks/use-image.test.tsx`.
 */
mock.module("~/lib/image", () => ({
  image: {
    load: (name: string) => Effect.succeed(`blob:${name}`),
    save: () => Effect.succeed(new ArrayBuffer(0)),
    del: () => Effect.succeed(undefined),
  },
}));

const { ImageViewer, swipeStep } = await import("./ImageViewer");

afterAll(() => {
  mock.restore();
});

const photos = [
  { name: "a.png", mime: "image/png" as const },
  { name: "b.png", mime: "image/png" as const },
  { name: "c.png", mime: "image/png" as const },
];

/** The frame's photo, by the alt text it carries for the position it is in. */
function frame(position: number, count = photos.length) {
  return screen.queryByAltText(`Gambar ${position} dari ${count}`);
}

describe("ImageViewer", () => {
  test("opens on the first photo, with the strip of all of them", async () => {
    render(<ImageViewer images={photos} />);

    await waitFor(() => expect(frame(1)).toBeTruthy());
    expect(screen.getAllByRole("button", { name: /^Gambar \d$/ })).toHaveLength(3);
    expect(screen.getByText("1 / 3")).toBeTruthy();
    // The selected tile is the one the frame is showing.
    expect(screen.getByRole("button", { name: "Gambar 1" }).getAttribute("aria-current")).toBe(
      "true",
    );
  });

  test("the arrows walk the photos and stop at both ends", async () => {
    render(<ImageViewer images={photos} />);
    const next = screen.getByRole("button", { name: "Gambar berikutnya" });
    const prev = screen.getByRole("button", { name: "Gambar sebelumnya" });

    expect((prev as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(next);
    await waitFor(() => expect(frame(2)).toBeTruthy());
    expect(screen.getByText("2 / 3")).toBeTruthy();

    fireEvent.click(next);
    await waitFor(() => expect(frame(3)).toBeTruthy());
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect((prev as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(prev);
    await waitFor(() => expect(frame(2)).toBeTruthy());
  });

  test("a thumbnail jumps the frame to that photo", async () => {
    render(<ImageViewer images={photos} />);

    fireEvent.click(screen.getByRole("button", { name: "Gambar 3" }));

    await waitFor(() => expect(frame(3)).toBeTruthy());
    expect(screen.getByRole("button", { name: "Gambar 3" }).getAttribute("aria-current")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Gambar 1" }).hasAttribute("aria-current")).toBe(
      false,
    );
  });

  test("the keyboard drives it from anywhere in the dialog", async () => {
    render(<ImageViewer images={photos} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => expect(frame(2)).toBeTruthy());

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    await waitFor(() => expect(frame(1)).toBeTruthy());

    fireEvent.keyDown(window, { key: "End" });
    await waitFor(() => expect(frame(3)).toBeTruthy());

    fireEvent.keyDown(window, { key: "Home" });
    await waitFor(() => expect(frame(1)).toBeTruthy());
  });

  test("a field with a caret of its own keeps its arrows", async () => {
    render(
      <div>
        <input aria-label="cari" />
        <ImageViewer images={photos} />
      </div>,
    );

    fireEvent.keyDown(screen.getByLabelText("cari"), { key: "ArrowRight" });

    await waitFor(() => expect(frame(1)).toBeTruthy());
    expect(frame(2)).toBeNull();
  });

  test("one photo is not a carousel", async () => {
    render(<ImageViewer images={[photos[0] as (typeof photos)[number]]} />);

    await waitFor(() => expect(frame(1, 1)).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Gambar berikutnya" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gambar 1" })).toBeNull();
    expect(screen.queryByText("1 / 1")).toBeNull();
  });

  test("no photos says so instead of drawing an empty frame", () => {
    render(<ImageViewer images={[]} />);

    expect(screen.getByText("Belum ada gambar.")).toBeTruthy();
  });

  test("a new set of photos starts over at the first one", async () => {
    const { rerender } = render(<ImageViewer images={photos} />);
    fireEvent.click(screen.getByRole("button", { name: "Gambar 3" }));
    await waitFor(() => expect(frame(3)).toBeTruthy());

    rerender(
      <ImageViewer
        images={[photos[0] as (typeof photos)[number], photos[1] as (typeof photos)[number]]}
      />,
    );

    await waitFor(() => expect(frame(1, 2)).toBeTruthy());
  });
});

/**
 * What a released drag means. The gesture itself lives in `motion`'s pan session,
 * which wants a laid-out page; the decision that session feeds is the part that
 * can be wrong, so it is the part under test.
 */
describe("swipeStep", () => {
  test("a drag far enough points the way it went", () => {
    expect(swipeStep(-140, 0)).toBe(1);
    expect(swipeStep(140, 0)).toBe(-1);
  });

  test("a short drag that was not thrown points nowhere", () => {
    expect(swipeStep(-20, 0)).toBe(0);
    expect(swipeStep(20, 120)).toBe(0);
  });

  test("a flick counts at a fraction of the distance", () => {
    expect(swipeStep(-12, -900)).toBe(1);
    expect(swipeStep(12, 900)).toBe(-1);
  });

  test("a flick against the drag it ended does not count", () => {
    // The hand came back: one release may not move the photo the way it was
    // pushed and then the way it was pulled.
    expect(swipeStep(-12, 900)).toBe(0);
  });

  test("letting go without moving anything changes nothing", () => {
    expect(swipeStep(0, 2000)).toBe(0);
  });
});
