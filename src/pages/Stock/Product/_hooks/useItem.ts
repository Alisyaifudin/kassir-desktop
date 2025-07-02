import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export const useItem = (id: number, db: Database) => {
	const fetchItem = useCallback(() => db.product.get.byId(id), []);
	const [item] = useFetch(fetchItem);
	const fetchImage = useCallback(() => db.image.get.byProductId(id), []);
	const [images, revalidate] = useFetch(fetchImage);
	
	return { item, images, revalidate };
};
