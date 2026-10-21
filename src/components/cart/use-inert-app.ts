import { useEffect } from "react";

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
