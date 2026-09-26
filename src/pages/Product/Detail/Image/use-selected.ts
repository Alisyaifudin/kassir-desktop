import { useSearchParams } from "react-router";
import { useCallback, useMemo } from "react";
import { ImageResult } from "./use-data";

export function useSelected(images: ImageResult[]) {
  const [search, setSearch] = useSearchParams();
  const selected = useMemo(() => {
    if (images.length === 0) return null;
    const selected = search.get("selected-image");
    if (selected === null) return null;
    const image = images.find((image) => image.id === selected);
    if (image !== undefined) return image;
    return images[0];
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
