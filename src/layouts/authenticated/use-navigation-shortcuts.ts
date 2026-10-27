import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { showShortcut } from "./use-shortcut";

const linkMap = {
  0: "/pos",
  1: "/restock",
  2: "/products",
  3: "/records",
  4: "/money",
  5: "/setting",
} as Record<string, string>;

/** Alt typing / AltGr / IME belong to the field the operator is in, not to us. */
function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (element === null || typeof element.tagName !== "string") return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable
  );
}

/**
 * How long the Alt-code guard stays armed while Alt is still held after its
 * digit, and how long it outlives the Alt release that actually flushes the
 * character. Both are wall-clock windows, not flags: the character arrives on
 * Alt *up*, i.e. after the keydown that armed them.
 */
const ALT_CODE_HELD_MS = 2_000;
const ALT_CODE_TAIL_MS = 250;

/** A top-row or numpad digit — the only keys Windows builds an Alt code from. */
function isDigit(key: string): boolean {
  return key.length === 1 && key >= "0" && key <= "9";
}

export function useNavigationShortcuts() {
  const navigate = useNavigate();
  const pressed = useRef(false);
  // Armed by an Alt+digit keydown, read by the character listeners below.
  const guardUntil = useRef(0);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      // Windows turns a held Alt plus digits into a character — the legacy "Alt
      // code", so Alt+1 types ☺ — and it does so *below* the browser: the OS
      // hands the webview a text input of its own, so the `preventDefault()`
      // under this line cancels the browser's typing but not the character.
      // Arm the guard here, before any early return: with a dialog open the
      // shortcut declines to navigate, and the ☺ would land in the dialog's
      // field instead of in the cart's.
      if (isDigit(e.key)) guardUntil.current = performance.now() + ALT_CODE_HELD_MS;
      // A dialog owns the keyboard: `Alt+3` out of "Pembayaran berhasil" would
      // unmount it and take the receipt print and the Batalkan/undo window with
      // it. Same contract the cart's own shortcuts obey.
      if (isScreenOwnedByDialog()) return;
      const link = linkMap[e.key] as string | undefined;
      // Only the combinations we act on are swallowed. Everything else — Alt
      // alone, Alt+Left, AltGr characters, Alt while typing — stays native.
      if (link === undefined) return;
      e.preventDefault();
      showShortcut(false);
      navigate(link);
    }

    /**
     * Cancel the character Windows inserts for an Alt code. `keypress` is the
     * legacy half (Chromium still fires it for character keys) and `beforeinput`
     * the modern one; capture phase, so it runs before the focused field's own
     * handlers can act on the text.
     */
    function swallowAltCode(e: Event) {
      if (performance.now() > guardUntil.current) return;
      // Only text is ours: focus moves and editing commands are not.
      if (e.type === "beforeinput" && (e as InputEvent).inputType !== "insertText") return;
      e.preventDefault();
    }

    function handleAltDown(e: KeyboardEvent) {
      if (e.key !== "Alt" || e.ctrlKey || e.metaKey) return;
      if (isEditableTarget(e.target)) return;
      // The legend would paint behind the dialog's overlay (invisible) while
      // flipping the inert shell's attributes, so leave it alone entirely.
      if (isScreenOwnedByDialog()) return;
      if (pressed.current) return;
      showShortcut((prev) => !prev);
      pressed.current = true;
    }

    function handleAltUp(e: KeyboardEvent) {
      if (e.key !== "Alt") return;
      pressed.current = false;
      // Releasing Alt is what flushes the Alt code, so the guard has to outlive
      // it by a few milliseconds — but no longer than that, or the field would
      // ignore the next character the operator actually types.
      guardUntil.current = Math.min(
        guardUntil.current,
        performance.now() + ALT_CODE_TAIL_MS,
      );
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keydown", handleAltDown);
    window.addEventListener("keyup", handleAltUp);
    window.addEventListener("keypress", swallowAltCode, true);
    window.addEventListener("beforeinput", swallowAltCode, true);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keydown", handleAltDown);
      window.removeEventListener("keyup", handleAltUp);
      window.removeEventListener("keypress", swallowAltCode, true);
      window.removeEventListener("beforeinput", swallowAltCode, true);
    };
  }, [navigate]);
}
