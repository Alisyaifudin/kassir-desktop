import MiniSearch, { SearchOptions, MatchInfo } from "minisearch";
import { useMemo } from "react";
import { ProductRecord } from "~/database/product";

export type ProductResult = Pick<
	ProductRecord,
	"barcode" | "name" | "price" | "capital" | "qty" | "id" | "timestamp" | "mode"
>;

export type Result = {
	terms: string[];
	queryTerms: string[];
	score: number;
	match: MatchInfo;
} & ProductResult;

export const useProductSearch = (all: ProductRecord[], mode: "buy" | "sell", query: string) => {
	const { miniSearch, raw } = useMemo(() => {
		const miniSearch = new MiniSearch<ProductRecord>({
			fields: ["name", "barcode"],
			storeFields: ["id", "name", "barcode", "price", "capital", "qty", "timestamp", "mode"],
			idField: "id",
			searchOptions: {
				tokenize: (query: string) => query.split(/[\s-&%#*]+/),
				processTerm: (term: string) => term.toLowerCase(),
			},
		});
		const products: ProductRecord[] = [];
		for (const p of all) {
			if (p.mode !== mode) {
				continue;
			}
			const findIndex = products.findIndex((product) => product.id === p.id);
			if (findIndex === -1) {
				products.push(p);
			} else {
				products[findIndex].qty += p.qty;
			}
		}
		miniSearch.addAll(products);
		return { miniSearch, raw: products };
	}, [all]);

	// Typed search function
	const search = (query: string, options?: SearchOptions) => {
		return miniSearch.search(query, options) as Result[];
	};
	const products = useMemo(() => {
		if (query.trim() === "") {
			return raw;
		}
		const res = search(query, {
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
		return res;
	}, [query, all]);
	return products;
};
