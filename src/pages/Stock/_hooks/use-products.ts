import { ProductResult, useProductSearch } from "~/hooks/useProductSearch";
import { sorting } from "../_utils/sorting";
import { useParams } from "./use-params";

export function useFilterProducts(all: DB.Product[]) {
	const { search } = useProductSearch(all);
	const { get } = useParams();
	const { query, sortBy, sortDir } = get;
	const products: ProductResult[] =
		query.trim() === ""
			? all
			: search(query.trim().replace(/(\(|\))/g, ""), {
					fuzzy: (term) => {
						if (term.split(" ").length === 1) {
							return 0.1;
						} else {
							return 0.2;
						}
					},
					prefix: true,
					combineWith: "AND",
			  });
	sorting(products, sortBy, sortDir);
	return products;
}
