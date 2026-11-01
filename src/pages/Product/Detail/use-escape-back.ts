import { useEffect } from "react";
import { useBack } from "~/services/route/react";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";

/**
 * `Esc` leaves the product detail: it is a screen you opened to look at one row,
 * so the way out belongs on the keyboard, like the tabs' own shortcuts.
 *
 * Where it goes is the app's own history — the list, the search, the pane the
 * detail was opened from, with the query it was left on, because a facet change
 * rewrites its entry instead of adding one. `/products` is what a detail with
 * nothing behind it returns to: a deep link, or a webview relaunched here.
 *
 * Escape is a shared key, so this stands down twice. A dialog that is open owns
 * it (Radix closes on Escape, and `isScreenOwnedByDialog` is the app's contract
 * for that), and so does anything that already called `preventDefault` — an open
 * combobox, the money editors, a grid cancelling its selection. Only a bare
 * Escape navigates.
 */
export function useEscapeBack() {
  const back = useBack("/products");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented || isScreenOwnedByDialog()) return;
      event.preventDefault();
      back();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [back]);
}
