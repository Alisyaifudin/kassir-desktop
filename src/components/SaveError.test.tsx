import { beforeEach, describe, expect, mock, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { Stream } from "effect";

/**
 * The cart writes to SQLite on a debounce, so a failed write used to be
 * invisible: the screen said "saved", the disk disagreed, and a crash lost the
 * sale. The service keeps the message in `get.saveError`; this component shows it
 * (and toasts it once) until a later write succeeds.
 */
let saveError: Stream.Stream<string | null, unknown> = Stream.never;
const toasted: string[] = [];

mock.module("~/services", () => ({
  service: {
    transaction: {
      get: {
        get saveError() {
          return saveError;
        },
      },
    },
  },
}));

mock.module("sonner", () => ({
  toast: { error: (message: string) => toasted.push(message) },
}));

const { SaveError } = await import("./SaveError");

beforeEach(() => {
  saveError = Stream.never;
  toasted.length = 0;
});

describe("SaveError", () => {
  test("nothing wrong is nothing on screen", async () => {
    saveError = Stream.make(null);
    const { container } = render(<SaveError />);

    await waitFor(() => expect(container.textContent).toBe(""));
    expect(toasted).toEqual([]);
  });

  test("a failed write is shown and toasted", async () => {
    saveError = Stream.make("Data gagal disimpan. Coba lagi.");
    render(<SaveError />);

    const banner = await screen.findByRole("status");
    expect(banner.textContent).toContain("Data gagal disimpan. Coba lagi.");
    expect(banner.getAttribute("aria-live")).toBe("polite");
    expect(toasted).toEqual(["Data gagal disimpan. Coba lagi."]);
  });

  test("a later successful write clears the banner", async () => {
    // The stream reports the failure, then a null from the write that succeeded.
    saveError = Stream.concat(Stream.make("Data gagal disimpan."), Stream.make(null));

    render(<SaveError />);

    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  test("the initial state shows nothing at all", () => {
    render(<SaveError />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
