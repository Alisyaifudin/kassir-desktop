import { useSearchParams } from "react-router";

/**
 * Which record the detail pane is showing, kept in the URL so a refresh keeps
 * the same row open.
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

