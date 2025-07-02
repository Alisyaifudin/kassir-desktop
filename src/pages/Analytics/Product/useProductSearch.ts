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
	const raw = useMemo(() => {
		const raw: ProductRecord[] = [];
		for (const p of all) {
			if (p.mode !== mode) {
				continue;
			}
			const findIndex = raw.findIndex((product) => product.id === p.id);
			if (findIndex === -1) {
				raw.push({ ...p });
			} else {
				raw[findIndex].qty += p.qty;
			}
		}
		return raw;
	}, [query, mode]);
	const miniSearch = useMemo(() => {
		const miniSearch = new MiniSearch<ProductRecord>({
			fields: ["name", "barcode"],
			storeFields: ["id", "name", "barcode", "price", "capital", "qty", "timestamp", "mode"],
			idField: "id",
			searchOptions: {
				tokenize: (query: string) => query.split(/[\s-&%#*]+/),
				processTerm: (term: string) => term.toLowerCase(),
			},
		});

		miniSearch.addAll(raw);
		return miniSearch;
	}, [raw]);

	// Typed search function
	const search = (query: string, options?: SearchOptions) => {
		return miniSearch.search(query, options) as Result[];
	};
	const productss = useMemo(() => {
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
	}, [query, raw]);
	return productss;
};
