import { Link, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { ProductListPromise } from "./ProductList.tsx";
import { useDb } from "../../Layout.tsx";
import { Await } from "../../components/Await.tsx";
import { useAsync } from "../../hooks/useAsync.tsx";
import { z } from "zod";
import { SortDir } from "./Sort.tsx";
import { Search } from "./Search.tsx";
import { numeric } from "../../lib/utils.ts";
import { useState } from "react";
import { Pagination } from "./Pagination.tsx";
import { TextError } from "../../components/TextError.tsx";

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const { sortDir, query, sortBy, page: rawPage } = getOption(search);
	const [pagination, setPagination] = useState<
		{ page: number; total: number } | { page: null; total: null }
	>({ page: null, total: null });
	const items = useItems();
	const setSortDir = (v: "asc" | "desc") => {
		setSearch({
			query,
			sortDir: v,
			sortBy,
			page: pagination.page ? pagination.page.toString() : "1",
		});
	};
	const setSortBy = (v: "barcode" | "name" | "price" | "capital" | "stock") => {
		setSearch({
			query,
			sortDir,
			sortBy: v,
			page: pagination.page ? pagination.page.toString() : "1",
		});
	};
	const setQuery = (v: string) => {
		setSearch({
			query: v,
			sortDir,
			sortBy,
			page: pagination.page ? pagination.page.toString() : "1",
		});
	};
	return (
		<main className="flex flex-col gap-5 p-2 overflow-auto">
			<div className="flex items-center gap-10">
				<SortDir sortDir={sortDir} setSortDir={setSortDir} sortBy={sortBy} setSortBy={setSortBy} />
				<Search query={query} setQuery={setQuery} />
				<Pagination {...pagination} setSearch={setSearch} />
				<Link to="/stock/new" className="self-end flex gap-5 items-center text-3xl">
					Tambah Produk
					<Button className="rounded-full h-13 w-13">
						<Plus size={35} />
					</Button>
				</Link>
			</div>
			<Await state={items}>
				{(data) => {
					const [errMsg, raw] = data;
					if (errMsg !== null) {
						return <TextError>{errMsg}</TextError>;
					}
					return (
						<ProductListPromise
							raw={raw}
							query={query}
							rawPage={rawPage}
							setPagination={(page: number, total: number) => setPagination({ page, total })}
							sortBy={sortBy}
							sortDir={sortDir}
						/>
					);
				}}
			</Await>
		</main>
	);
}

const useItems = () => {
	const db = useDb();
	const items = useAsync(db.product.getAll(), []);
	return items;
};

function getOption(search: URLSearchParams): {
	sortDir: "asc" | "desc";
	sortBy: "barcode" | "name" | "price" | "capital" | "stock";
	query: string;
	page: number;
} {
	const sortDirParsed = z.enum(["asc", "desc"]).safeParse(search.get("sortDir"));
	const sortDir = sortDirParsed.success ? sortDirParsed.data : "asc";
	const sortByParsed = z
		.enum(["barcode", "name", "price", "capital", "stock"])
		.safeParse(search.get("sortBy"));
	const sortBy = sortByParsed.success ? sortByParsed.data : "name";
	const pageParsed = numeric.safeParse(search.get("page"));
	const page = pageParsed.success ? pageParsed.data : 1;
	const query = search.get("query") ?? "";
	return { sortDir, query, sortBy, page: page < 1 ? 1 : Math.round(page) };
}
