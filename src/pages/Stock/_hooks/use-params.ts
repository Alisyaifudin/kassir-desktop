import { useSearchParams } from "react-router";
import { z } from "zod";
import { integer } from "~/lib/utils";

export function useParams() {
	const [search, setSearch] = useSearchParams();
	const { limit, page, query, sortBy, sortDir } = getOption(search);
	const get = {
		page,
		sortDir,
		sortBy,
		query,
		limit,
	};
	const set = {
		page: (v: number) => {
			setSearch((s) => {
				const search = new URLSearchParams(s);
				search.set("page", v.toString());
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
	page: number;
	limit: number;
} {
	const sortDir = z.enum(["asc", "desc"]).catch("asc").parse(search.get("sortDir"));
	const sortBy = z
		.enum(["barcode", "name", "price", "capital", "stock"])
		.catch("name")
		.parse(search.get("sortBy"));
	const page = integer.catch(1).parse(search.get("page"));
	const limit = z
		.enum(["10", "20", "50", "100"])
		.catch("100")
		.transform(Number)
		.parse(search.get("limit"));
	const query = search.get("query") ?? "";
	return { sortDir, query, sortBy, limit, page: page < 1 ? 1 : page };
}
