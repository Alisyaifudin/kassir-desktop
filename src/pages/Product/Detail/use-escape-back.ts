import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { isScreenOwnedByDialog } from "~/hooks/use-dialog-lock";
import { urlBackOf } from "~/lib/utils";

/**
 * `Esc` leaves the product detail: it is a screen you opened to look at one row,
 * so the way out belongs on the keyboard, like the tabs' own shortcuts.
 *
 * Where it goes is the `url_back` the tab strip already carries — the list, the
 * search, the page it was opened from — and, when the detail was reached with no
 * `url_back` at all (a deep link, a bookmark, a refresh of a bare URL), the
 * browser's own history, through the router's `navigate(-1)`. Guessing `/products`
 * there instead would push a new entry: `Back` would then return to the detail it
 * just left.
 *
 * Escape is a shared key, so this stands down twice. A dialog that is open owns
 * it (Radix closes on Escape, and `isScreenOwnedByDialog` is the app's contract
 * for that), and so does anything that already called `preventDefault` — an open
 * combobox, the money editors, a grid cancelling its selection. Only a bare
 * Escape navigates.
 */
export function useEscapeBack() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented || isScreenOwnedByDialog()) return;
      event.preventDefault();
      const back = urlBackOf(new URLSearchParams(search));
      if (back === null) navigate(-1);
      else navigate(back);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, search]);
}
