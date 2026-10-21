import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * The open draft, kept in the URL as `?draft=<id>` alongside `?stage=`, so a
 * refresh or a shared link lands on the same tab.
 *
 * The write **replaces** the history entry. This is transient UI state, not a
 * navigation: every tab switch, stage toggle, F12 and park would otherwise push
 * a `?draft=`/`?stage=` entry, so Back (and Alt+Left, and a mouse's back
 * button) would rewind through the carts of the sale being rung up instead of
 * leaving the screen — silently putting a *different* open cart under the
 * cashier's cursor.
 */
export function useDraftId() {
  const [search, setSearch] = useSearchParams();
  const id = search.get("draft");
  const setId = useCallback(
    (id: string | null) => {
      setSearch(
        (old) => {
          const next = new URLSearchParams(old);
          if (id === null) next.delete("draft");
          else next.set("draft", id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearch],
  );
  return [id, setId] as const;
}
