import { Link, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { ProductList } from "./ProductList.tsx";
import { useDb } from "../../Layout.tsx";
import { Await } from "../../components/Await.tsx";
import { useAsync } from "../../hooks/useAsync.tsx";
import { TextError } from "../../components/TextError.tsx";
import { z } from "zod";
import { SortDir } from "./Sort.tsx";
import { Search } from "./Search.tsx";

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const { sortDir, query, sortBy } = getOption(search);
	const items = useItems();
	const setSortDir = (v: "asc" | "desc") => {
		setSearch({
			query,
			sortDir: v,
			sortBy,
		});
	};
	const setSortBy = (v: "barcode" | "name" | "price" | "capital" | "stock") => {
		setSearch({
			query,
			sortDir,
			sortBy: v,
		});
	};
	const setQuery = (v: string) => {
		setSearch({
			query: v,
			sortDir,
			sortBy,
		});
	};
	return (
		<main className="flex flex-col gap-5 p-2 overflow-auto">
			<div className="flex items-center gap-10">
				<SortDir sortDir={sortDir} setSortDir={setSortDir} sortBy={sortBy} setSortBy={setSortBy} />
				<Search query={query} setQuery={setQuery} />
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
					const products =
						query === ""
							? raw
							: raw.filter(
									(product) =>
										product.name.toLowerCase().includes(query.toLowerCase()) ||
										(product.barcode !== null && product.barcode.toString().includes(query))
							  );
					sorting(products, sortBy, sortDir);
					return <ProductList products={products} />;
				}}
			</Await>
		</main>
	);
}

function sorting(
	products: DB.Product[],
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

const useItems = () => {
	const db = useDb();
	const items = useAsync(db.product.getAll(), []);
	return items;
};

function getOption(search: URLSearchParams): {
	sortDir: "asc" | "desc";
	sortBy: "barcode" | "name" | "price" | "capital" | "stock";
	query: string;
} {
	const sortDirParsed = z.enum(["asc", "desc"]).safeParse(search.get("sortDir"));
	const sortDir = sortDirParsed.success ? sortDirParsed.data : "asc";
	const sortByParsed = z
		.enum(["barcode", "name", "price", "capital", "stock"])
		.safeParse(search.get("sortBy"));
	const sortBy = sortByParsed.success ? sortByParsed.data : "name";
	const query = search.get("query") ?? "";
	return { sortDir, query, sortBy };
}
