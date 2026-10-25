import { useEffect } from "react";

/**
 * The "a dialog owns the keyboard" contract.
 *
 * It lives in `~/hooks` rather than in `~/components/cart` because it is not a
 * cart rule: the app-wide navigator (`src/layouts/authenticated`) has its own
 * `window` listeners and has to obey the same contract, and a layout reaching
 * into the cart folder for a predicate is how that obligation gets forgotten.
 * Everything that listens on `window` consults `isScreenOwnedByDialog()`.
 *
 * Module-level on purpose: the listeners live on `window` (so they work from any
 * panel), which means they cannot see a dialog through React state that is two
 * components away. A tiny counter is the cheapest honest answer, and it is read
 * at event time, not during render.
 */
let openDialogs = 0;

/**
 * True while a dialog that took the keyboard away from the screen is open.
 *
 * `inert` on `#root` and Radix's focus trap both stop Tab and the pointer, but
 * neither stops a `keydown` listener registered on `window` — and every Dialog
 * portal renders outside `#root`. So F12 could write a new draft to SQLite
 * behind the "Pembayaran berhasil" dialog, F1 could reset the grid selection
 * behind the money editors, and `Alt+3` could navigate away from the completion
 * dialog's print/undo exits (losing the receipt and the undo window). The DOM
 * fallback catches a modal that never called `useDialogLock` (Radix sets
 * `aria-modal` itself).
 */
export function isScreenOwnedByDialog(): boolean {
  if (openDialogs > 0) return true;
  if (typeof document === "undefined") return false;
  return document.querySelector('[aria-modal="true"]') !== null;
}

/** Publish "a dialog owns the screen" while `open`. */
export function useDialogLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    openDialogs += 1;
    return () => {
      openDialogs -= 1;
    };
  }, [open]);
}
