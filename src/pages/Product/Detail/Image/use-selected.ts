import { useSearchParams } from "react-router";
import { useCallback, useMemo } from "react";
export function useSelected<T extends { id: string }>(images: T[]) {
  const [search, setSearch] = useSearchParams();
  /**
   * Never null while the product has images. The thumbnails compare
   * `selected.id` and the preview/delete button expect a selection, so a missing
   * or stale `selected-image` param must fall back to the first image instead of
   * leaving the page without a selection.
   */
  const selected = useMemo(() => {
    if (images.length === 0) return null;
    const id = search.get("selected-image");
    if (id === null) return images[0];
    return images.find((image) => image.id === id) ?? images[0];
  }, [search, images]);
  const setSelected = useCallback(
    (id: string) => {
      setSearch((prev) => {
        const search = new URLSearchParams(prev);
        search.set("selected-image", id);
        return search;
      });
    },
    [setSearch],
  );
  return [selected, setSelected] as const;
}
