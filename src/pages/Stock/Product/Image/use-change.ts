import { ImageResult } from "./loader";
import { useSelected } from "./use-selected";

export function useChange(images: ImageResult[]) {
	const [selected, setSelected] = useSelected(images);
	const index = images.findIndex((image) => image.id === selected?.id);
	function handleChangeNext() {
		if (index === -1 || index === images.length - 1) return;
		setSelected(images[index + 1].id);
	}
	function handleChangePrev() {
		if (index === -1 || index === 0) return;
		setSelected(images[index - 1].id);
	}
	return [index, handleChangePrev, handleChangeNext] as const;
}
