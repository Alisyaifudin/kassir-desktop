import { useAdditionalSearch } from "~/hooks/useAdditionalSearch";
import { useParams } from "./use-params";

export function useFilterAdditionals(all: DB.AdditionalItem[]) {
	const { search } = useAdditionalSearch(all);
	const { get } = useParams();
	const { query } = get;
	const products: DB.AdditionalItem[] =
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
	return products;
}
