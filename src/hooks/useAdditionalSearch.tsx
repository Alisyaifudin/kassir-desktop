import MiniSearch, { SearchOptions, MatchInfo } from "minisearch";
import { useMemo } from "react";

export type MiniSearchProduct = {
	terms: string[];
	queryTerms: string[];
	score: number;
	match: MatchInfo;
} & DB.AdditionalItem;

export const useAdditionalSearch = (products: DB.AdditionalItem[]) => {
	const miniSearch = useMemo(() => {
		const instance = new MiniSearch<DB.AdditionalItem>({
			fields: ["name"],
			storeFields: ["id", "name", "value", "kind"],
			idField: "id",
			searchOptions: {
				tokenize: (query: string) => query.split(/[\s-&%#*.]+/),
				processTerm: (term: string) => term.toLowerCase(),
			},
		});
		products.sort((a, b) => a.name.localeCompare(b.name));
		instance.addAll(products);
		return instance;
	}, [products]);

	// Typed search function
	const search = (query: string, options?: SearchOptions) => {
		return miniSearch.search(query, options) as MiniSearchProduct[];
	};

	return { search };
};
