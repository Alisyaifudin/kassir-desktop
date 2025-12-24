import { useSearchParams } from "react-router";
import { useCallback, useMemo } from "react";
import { integer } from "~/lib/utils";
import { ImageResult } from "./loader";

export function useSelected(images: ImageResult[]) {
	const [search, setSearch] = useSearchParams();
	const selected = useMemo(() => {
		if (images.length === 0) return null;
		const parsed = integer.safeParse(search.get("selected-image"));
		if (parsed.success) {
			const image = images.find((image) => image.id === parsed.data);
			if (image !== undefined) {
				return image;
			}
		}
		return images[0];
	}, [search, images]);
	const setSelected = useCallback(
		(id: number) => {
			setSearch((prev) => {
				const search = new URLSearchParams(prev);
				search.set("selected-image", id.toString());
				return search;
			});
		},
		[setSearch]
	);
	return [selected, setSelected] as const;
}
