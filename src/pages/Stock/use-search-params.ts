import { useSearchParams as useSearchP } from "react-router";
import { z } from "zod";
import { integer } from "~/lib/utils";

export function useSearchParams() {
	const [search, setSearch] = useSearchP();
	const { limit, pageProduct, pageAdditional, query, sortBy, sortDir, tab } = getOption(search);
	const get = {
		pageProduct,
		pageAdditional,
		sortDir,
		sortBy,
		query,
		limit,
		tab,
	};
	const set = {
		tab: (v: string) => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("tab", v.toString());
				return search;
			});
		},
		pageProduct: (v: number) => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("page-product", v.toString());
				return search;
			});
		},
		pageAdditional: (v: number) => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("page-additional", v.toString());
				return search;
			});
		},
		sortDir: (v: "asc" | "desc") => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("sortDir", v);
				return search;
			});
		},
		sortBy: (v: "barcode" | "name" | "price" | "capital" | "stock") => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("sortBy", v);
				return search;
			});
		},
		query: (v: string) => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("query", v);
				return search;
			});
		},
		limit: (v: string) => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("limit", v);
				return search;
			});
		},
	};
	return { set, get };
}

export function getOption(search: URLSearchParams): {
	sortDir: "asc" | "desc";
	sortBy: "barcode" | "name" | "price" | "capital" | "stock";
	query: string;
	pageProduct: number;
	pageAdditional: number;
	limit: number;
	tab: "product" | "extra";
} {
	const sortDir = z.enum(["asc", "desc"]).catch("asc").parse(search.get("sortDir"));
	const tab = z.enum(["product", "extra"]).catch("product").parse(search.get("tab"));
	const sortBy = z
		.enum(["barcode", "name", "price", "capital", "stock"])
		.catch("name")
		.parse(search.get("sortBy"));
	const pageProduct = integer.catch(1).parse(search.get("page-product"));
	const pageAdditional = integer.catch(1).parse(search.get("page-additional"));
	const limit = z
		.enum(["10", "20", "50", "100"])
		.catch("100")
		.transform(Number)
		.parse(search.get("limit"));
	const query = search.get("query") ?? "";
	return {
		sortDir,
		query,
		sortBy,
		limit,
		pageProduct: pageProduct < 1 ? 1 : pageProduct,
		pageAdditional: pageAdditional < 1 ? 1 : pageAdditional,
		tab,
	};
}
