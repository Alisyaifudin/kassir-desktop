import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * The open draft, kept in the URL as `?draft=<id>` alongside `?stage=`, so a
 * refresh or a shared link lands on the same tab.
 */
export function useDraftId() {
  const [search, setSearch] = useSearchParams();
  const id = search.get("draft");
  const setId = useCallback(
    (id: string | null) => {
      setSearch((old) => {
        const next = new URLSearchParams(old);
        if (id === null) next.delete("draft");
        else next.set("draft", id);
        return next;
      });
    },
    [setSearch],
  );
  return [id, setId] as const;
}
