import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useDialogLock } from "~/hooks/use-dialog-lock";
import { showShortcut, useShortcut } from "./use-shortcut";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";

/**
 * The app-wide navigator. It listens on `window` from the authenticated layout,
 * so it is alive on every screen — including Pos and Restock while a cart dialog
 * owns the keyboard. `Alt+3` out of "Pembayaran berhasil" used to unmount the
 * dialog and lose the receipt print and the Batalkan/undo window it exists for.
 *
 * A real `MemoryRouter` and the real shortcut atom: mocking either would test a
 * different module than the one the app mounts.
 */

let path = "/pos";
let legendOn = false;

function Probe() {
  path = useLocation().pathname;
  legendOn = useShortcut();
  return null;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/pos"]}>
      <Probe />
      {children}
    </MemoryRouter>
  );
}

function harness(lock = false) {
  return renderHook(
    () => {
      if (lock) useDialogLock(true);
      useNavigationShortcuts();
    },
    { wrapper },
  );
}

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    document.body.dispatchEvent(event);
  });
  return event;
}

function release(key: string) {
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  });
}

/**
 * What Windows sends the webview on Alt release when an Alt code was typed: a
 * text insertion of its own, in no way tied to the keydown the app already
 * swallowed. Dispatched on a field, cancelable, so the guard can be observed.
 */
function typeAltCode(input: HTMLInputElement) {
  const event = new InputEvent("beforeinput", {
    inputType: "insertText",
    data: "☺",
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    input.dispatchEvent(event);
  });
  return event;
}

function field() {
  const input = document.createElement("input");
  document.body.append(input);
  return input;
}

beforeEach(() => {
  path = "/pos";
  legendOn = false;
  document.body.innerHTML = "";
});

afterEach(() => {
  // Clear the legend's 5 s timer so it cannot leak into the next case.
  act(() => showShortcut(false));
});

describe("useNavigationShortcuts", () => {
  test("Alt+digit navigates while no dialog owns the screen", () => {
    harness();
    press("3", { altKey: true });
    expect(path).toBe("/records");
    press("5", { altKey: true });
    expect(path).toBe("/setting");
  });

  test("Alt alone shows the legend while no dialog owns the screen", () => {
    harness();
    press("Alt");
    expect(legendOn).toBe(true);
    release("Alt");
  });

  test("no Alt+digit navigates while a cart dialog is registered", () => {
    harness(true);
    press("3", { altKey: true });
    press("5", { altKey: true });
    expect(path).toBe("/pos");
  });

  test("the legend does not toggle behind a registered dialog", () => {
    harness(true);
    press("Alt");
    release("Alt");
    expect(legendOn).toBe(false);
  });

  test("a portaled [aria-modal] dialog holds the shortcuts too", () => {
    harness();
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.append(modal);

    press("3", { altKey: true });
    expect(path).toBe("/pos");

    modal.remove();
    press("3", { altKey: true });
    expect(path).toBe("/records");
  });

  test("plain digits and AltGr combinations stay native", () => {
    harness();
    press("3");
    press("3", { altKey: true, ctrlKey: true });
    expect(path).toBe("/pos");
  });

  test("the Alt code Windows types after Alt+digit never reaches the field", () => {
    harness();
    const input = field();

    press("1", { altKey: true });
    expect(path).toBe("/restock");
    expect(typeAltCode(input).defaultPrevented).toBe(true);
  });

  test("it is swallowed behind a dialog too, where the shortcut only declines", () => {
    harness(true);
    const input = field();

    press("1", { altKey: true });
    expect(path).toBe("/pos");
    expect(typeAltCode(input).defaultPrevented).toBe(true);
  });

  test("typing without an Alt+digit is untouched", () => {
    harness();
    const input = field();

    press("3");
    press("5", { altKey: true, ctrlKey: true });
    expect(typeAltCode(input).defaultPrevented).toBe(false);
  });
});
