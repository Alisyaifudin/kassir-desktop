import { useAsync } from "~/hooks/useAsync";
import { image } from "~/lib/image";

export function useGetImages(images: DB.Image[]) {
	const state = useAsync(() => Promise.all(images.map((img) => image.load(img.name, img.mime))));
	return state;
}