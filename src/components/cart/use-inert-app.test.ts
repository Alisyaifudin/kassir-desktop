import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { renderHook } from "@testing-library/react";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { useInertApp } from "./use-inert-app";

/**
 * While a cart money editor (a `modal={false}` Radix dialog portaled next to
 * `#root`) is open, the app shell is made inert so Tab cannot walk into the grid
 * behind the overlay. Two rules matter: only the shell is touched — the dialog's
 * own portal must stay live — and an `inert` the hook did not set is left for its
 * owner to undo.
 */
let root: HTMLElement;

beforeEach(() => {
  root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
});

describe("useInertApp", () => {
  test("a closed editor touches nothing", () => {
    const view = renderHook(({ open }) => useInertApp(open), { initialProps: { open: false } });

    expect(root.hasAttribute("inert")).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);
    view.unmount();
  });

  test("an open editor takes the shell out of the keyboard and the a11y tree", () => {
    const view = renderHook(() => useInertApp(true));

    expect(root.hasAttribute("inert")).toBe(true);
    expect(root.getAttribute("aria-hidden")).toBe("true");

    view.unmount();

    expect(root.hasAttribute("inert")).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);
  });

  test("closing the editor puts the shell back", () => {
    const view = renderHook(({ open }) => useInertApp(open), { initialProps: { open: true } });

    view.rerender({ open: false });

    expect(root.hasAttribute("inert")).toBe(false);
    expect(root.hasAttribute("aria-hidden")).toBe(false);
    view.unmount();
  });

  test("an inert the hook did not set is left for its owner", () => {
    // A submit in flight also makes the shell inert; the dialog must not clear it.
    root.setAttribute("inert", "");

    const view = renderHook(() => useInertApp(true));
    view.unmount();

    expect(root.hasAttribute("inert")).toBe(true);
    root.removeAttribute("inert");
  });

  test("no shell at all is not a crash", () => {
    root.remove();

    expect(() => renderHook(() => useInertApp(true)).unmount()).not.toThrow();
  });

  test("the dialog also locks the page-level shortcuts", () => {
    // The same editors are the reason `isScreenOwnedByDialog` exists.
    const view = renderHook(() => useInertApp(true));
    expect(isScreenOwnedByDialog()).toBe(true);

    view.unmount();
    expect(isScreenOwnedByDialog()).toBe(false);
  });
});
