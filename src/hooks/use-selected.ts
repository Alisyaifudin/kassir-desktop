import { useSearchParams } from "~/services/route/react";

/**
 * Which row the detail pane is showing, kept in the URL so a refresh keeps the
 * same row open — for every two-pane screen (`/records`, `/report`).
 *
 * Shared rather than copied: the write semantics are the part that is easy to get
 * wrong and easy to get *differently* wrong in a second copy — `replace` rather
 * than `push`, and clicking the open row closes the pane instead of re-selecting
 * it. `/products/:id/image` has a third copy of the idea with its own shape; it is
 * a carousel, not a pane, and left alone.
 *
 * The write **replaces** the history entry: picking a row is a selection inside
 * this screen, not a place to go Back to — otherwise Back would step through
 * every row the operator looked at instead of leaving Records.
 */
export function useSelected() {
  const [search, setSearch] = useSearchParams();
  const selected = search.get("selected");
  function setSelected(clicked: string | null) {
    setSearch(
      (old) => {
        const search = new URLSearchParams(old);
        if (clicked === null || clicked === selected) {
          search.delete("selected");
        } else {
          search.set("selected", clicked);
        }
        return search;
      },
      { replace: true },
    );
  }
  return [selected, setSelected] as const;
}

export function useUnselect() {
  const [, setSelected] = useSelected();
  return () => setSelected(null);
}

