import { Link, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button.tsx";
import { ProductList } from "./ProductList.tsx";
import { z } from "zod";
import { SortDir } from "./Sort.tsx";
import { Search } from "./Search.tsx";
import { numeric } from "~/lib/utils.ts";
import { useEffect, useState } from "react";
import { Pagination } from "./Pagination.tsx";
import { useProducts, useUser } from "~/Layout.tsx";
import { ProductResult, useProductSearch } from "~/hooks/useProductSearch.tsx";

export default function Page() {
	const { products } = useProducts();
	return (
		<main className="flex flex-col gap-5 p-2 flex-1 overflow-auto">
			<Stock products={products} />
		</main>
	);
}

function Stock({ products: all }: { products: DB.Product[] }) {
	const [searchParams, setSearch] = useSearchParams();
	const [products, setProducts] = useState<ProductResult[]>(all);
	const { sortDir, query, sortBy, page: rawPage, limit } = getOption(searchParams);
	const { search } = useProductSearch(all);
	const user = useUser();
	if (query.trim() === "") {
		sorting(products, sortBy, sortDir);
	}
	const totalItem = products.length;
	const totalPage = Math.ceil(totalItem / limit);
	const page = rawPage > totalPage ? totalPage : rawPage;
	const start = limit * (page - 1);
	const end = limit * page;
	const [pagination, setPagination] = useState<
		{ page: number; total: number } | { page: null; total: null }
	>({ page, total: totalPage });
	useEffect(() => {
		setPagination({page, total:totalPage});
	}, [page, totalPage]);
	useEffect(() => {
		if (query.trim() === "") {
			setProducts(all);
		} else {
			const res = search(query.trim(), {
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
			setProducts(res);
		}
	}, [query]);
	const setSortDir = (v: "asc" | "desc") => {
		setSearch({
			query,
			sortDir: v,
			sortBy,
			page: pagination.page ? pagination.page.toString() : "1",
			limit: limit.toString(),
		});
	};
	const setSortBy = (v: "barcode" | "name" | "price" | "capital" | "stock") => {
		setSearch({
			query,
			sortDir,
			sortBy: v,
			page: pagination.page ? pagination.page.toString() : "1",
			limit: limit.toString(),
		});
	};
	const setQuery = (v: string) => {
		setSearch({
			query: v,
			sortDir,
			sortBy,
			page: pagination.page ? pagination.page.toString() : "1",
			limit: limit.toString(),
		});
	};
	const setLimit = (limit: string) => {
		setSearch({
			query,
			sortDir,
			sortBy,
			page: pagination.page ? pagination.page.toString() : "1",
			limit,
		});
	};
	return (
		<>
			<div className="flex items-center gap-10">
				<SortDir sortDir={sortDir} setSortDir={setSortDir} sortBy={sortBy} setSortBy={setSortBy} />
				<Search query={query} setQuery={setQuery} />
				<div className="flex items-center gap-2">
					<Pagination {...pagination} setSearch={setSearch} />
					<div className="relative">
						<span className="absolute -top-5 left-1 text-lg z-10 px-1 bg-white">limit</span>
						<select
							value={limit}
							className="w-fit text-3xl"
							onChange={(e) => setLimit(e.currentTarget.value)}
						>
							<option value={10}>10</option>
							<option value={20}>20</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
						</select>
					</div>
					{user.role === "admin" ? (
						<Link to="/stock/new" className="self-end flex gap-5 items-center text-3xl w-fit">
							Tambah Produk
							<Button className="rounded-full h-13 w-13">
								<Plus size={35} />
							</Button>
						</Link>
					) : null}
				</div>
			</div>
			<ProductList
				products={products}
				start={start}
				end={end}
			/>
		</>
	);
}

function getOption(search: URLSearchParams): {
	sortDir: "asc" | "desc";
	sortBy: "barcode" | "name" | "price" | "capital" | "stock";
	query: string;
	page: number;
	limit: number;
} {
	const sortDirParsed = z.enum(["asc", "desc"]).safeParse(search.get("sortDir"));
	const sortDir = sortDirParsed.success ? sortDirParsed.data : "asc";
	const sortByParsed = z
		.enum(["barcode", "name", "price", "capital", "stock"])
		.safeParse(search.get("sortBy"));
	const sortBy = sortByParsed.success ? sortByParsed.data : "name";
	const pageParsed = numeric.safeParse(search.get("page"));
	const page = pageParsed.success ? pageParsed.data : 1;
	const limitParsed = z.enum(["10", "20", "50", "100"]).safeParse(search.get("limit"));
	const limit = limitParsed.success ? Number(limitParsed.data) : 100;
	const query = search.get("query") ?? "";
	return { sortDir, query, sortBy, limit, page: page < 1 ? 1 : Math.round(page) };
}


function sorting(
	products: ProductResult[],
	by: "barcode" | "name" | "price" | "capital" | "stock",
	dir: "asc" | "desc"
) {
	const sign = dir === "asc" ? 1 : -1;
	switch (by) {
		case "barcode":
			products.sort((a, b) => {
				if (a.barcode === null && b.barcode === null) return 0 * sign;
				if (a.barcode === null) return -1 * sign;
				if (b.barcode === null) return 1 * sign;
				return a.barcode.localeCompare(b.barcode) * sign;
			});
			break;
		case "price":
			products.sort((a, b) => (a.price - b.price) * sign);
			break;
		case "capital":
			products.sort((a, b) => (a.capital - b.capital) * sign);
			break;
		case "stock":
			products.sort((a, b) => (a.stock - b.stock) * sign);
			break;
		case "name":
			products.sort((a, b) => a.name.localeCompare(b.name) * sign);
	}
}