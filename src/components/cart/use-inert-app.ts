import { useEffect } from "react";

/**
 * How many dialogs currently own the screen.
 *
 * Module-level on purpose: `useCartScreen`'s F1/F2/F12 handlers live on
 * `window` (so they work from any panel), which means they cannot see a dialog
 * through React state that is two components away. A tiny counter is the
 * cheapest honest answer, and it is read at event time, not during render.
 */
let openDialogs = 0;

/**
 * True while a dialog that took the keyboard away from the screen is open.
 *
 * `inert` on `#root` and Radix's focus trap both stop Tab and the pointer, but
 * neither stops a `keydown` listener registered on `window` — and every Dialog
 * portal renders outside `#root`. So F12 could write a new draft to SQLite
 * behind the "Pembayaran berhasil" dialog and F1 could reset the grid selection
 * behind the money editors. The DOM fallback catches a modal that never called
 * `useDialogLock` (Radix sets `aria-modal` itself).
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

/**
 * Takes the rest of the app out of the keyboard and the accessibility tree
 * while one of the cart editors is open.
 *
 * Both money editors (`z-Methods` payment, `z-Discount` line discounts) render
 * `<Dialog modal={false}>`: Radix's focus trap fights the kind `Select`'s portal
 * on React 19, so the trap is off and the dialog is portaled to `document.body`.
 * Without this, Tab walks straight out of the dialog into the cart grid behind
 * the overlay — where Enter edits money the cashier cannot see — and a screen
 * reader is never told the dialog is modal.
 *
 * Only the app shell (`#root`) is made inert: every Dialog portal (the content,
 * the overlay, the Select popups) lives beside it on `body`, so the dialog and
 * its popups stay live. This is the same `inert` idiom the cart pages use while
 * a submit is in flight.
 */
export function useInertApp(open: boolean) {
  // Every caller is a dialog that owns the keyboard, so it registers itself for
  // the page-level shortcuts too — not only while it manages `#root`.
  useDialogLock(open);
  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root");
    // Already inert for another reason (a submit in flight): leave it alone and
    // let its own owner clean up.
    if (root === null || root.hasAttribute("inert")) return;
    root.setAttribute("inert", "");
    root.setAttribute("aria-hidden", "true");
    return () => {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
    };
  }, [open]);
}
