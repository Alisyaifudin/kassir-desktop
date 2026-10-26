import { describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import { isScreenOwnedByDialog, useDialogLock } from "./use-dialog-lock";

/**
 * "A dialog owns the keyboard" is the contract every `window` listener consults —
 * the app navigator, the transaction tabs, the cart's F-keys. A `keydown` on
 * `window` bypasses both Radix's focus trap and `inert` on `#root`, so a wrong
 * answer here writes to SQLite from behind a closed dialog. Two sources: the
 * counter a mounted dialog bumps, and the DOM fallback for a modal that never
 * called the hook.
 */
describe("isScreenOwnedByDialog", () => {
  test("nothing open, nothing owned", () => {
    expect(isScreenOwnedByDialog()).toBe(false);
  });

  test("a modal in the DOM owns the screen even without the hook", () => {
    // Radix sets `aria-modal` itself; a dialog that never called `useDialogLock`
    // must still be respected.
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    try {
      expect(isScreenOwnedByDialog()).toBe(true);
    } finally {
      modal.remove();
    }
  });

  test("a non-modal aria marker does not count", () => {
    const region = document.createElement("div");
    region.setAttribute("aria-modal", "false");
    document.body.appendChild(region);
    try {
      expect(isScreenOwnedByDialog()).toBe(false);
    } finally {
      region.remove();
    }
  });
});

describe("useDialogLock", () => {
  test("locks while open and unlocks on unmount", () => {
    const dialog = renderHook(() => useDialogLock(true));
    expect(isScreenOwnedByDialog()).toBe(true);

    dialog.unmount();
    expect(isScreenOwnedByDialog()).toBe(false);
  });

  test("two dialogs stack: closing one keeps the screen locked", () => {
    // The completion dialog can open a print/undo confirmation on top of itself.
    const first = renderHook(() => useDialogLock(true));
    const second = renderHook(() => useDialogLock(true));

    first.unmount();
    expect(isScreenOwnedByDialog()).toBe(true);

    second.unmount();
    expect(isScreenOwnedByDialog()).toBe(false);
  });

  test("a closed dialog publishes nothing", () => {
    const dialog = renderHook(() => useDialogLock(false));
    expect(isScreenOwnedByDialog()).toBe(false);
    dialog.unmount();
  });

  test("flipping open → closed releases the lock", () => {
    const dialog = renderHook(({ open }) => useDialogLock(open), {
      initialProps: { open: true },
    });
    expect(isScreenOwnedByDialog()).toBe(true);

    dialog.rerender({ open: false });
    expect(isScreenOwnedByDialog()).toBe(false);

    dialog.unmount();
  });
});
