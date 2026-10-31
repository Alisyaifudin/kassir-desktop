import { useEffect } from "react";
import { useBack, useLocation } from "~/services/route/react";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { urlBackOf } from "~/lib/utils";

/**
 * `Esc` leaves the product detail: it is a screen you opened to look at one row,
 * so the way out belongs on the keyboard, like the tabs' own shortcuts.
 *
 * Where it goes is the app's own history — the list, the search, the pane the
 * detail was opened from, with the query it was left on, because a facet change
 * rewrites its entry instead of adding one. That used to be a `url_back` threaded
 * through every link that led here; it is now only the fallback, for the one case
 * the history cannot answer: a detail reached by a deep link or a relaunched
 * webview, where there is no screen behind this one.
 *
 * Escape is a shared key, so this stands down twice. A dialog that is open owns
 * it (Radix closes on Escape, and `isScreenOwnedByDialog` is the app's contract
 * for that), and so does anything that already called `preventDefault` — an open
 * combobox, the money editors, a grid cancelling its selection. Only a bare
 * Escape navigates.
 */
export function useEscapeBack() {
  const { search } = useLocation();
  const back = useBack(urlBackOf(new URLSearchParams(search)) ?? "/products");

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
