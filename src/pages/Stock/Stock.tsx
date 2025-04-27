import { Link, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { ProductList } from "./ProductList.tsx";
import { useDb } from "../../Layout.tsx";
import { Await } from "../../components/Await.tsx";
import { useFetch } from "../../hooks/useFetch.tsx";
import { TextError } from "../../components/TextError.tsx";
import { z } from "zod";
import { Sort } from "./Sort.tsx";
import { Search } from "./Search.tsx";

export default function Page() {
	const [search, setSearch] = useSearchParams();
	const { sort, query } = getOption(search);
	const items = useItems();
	const setSort = (v: "asc" | "desc") => {
		setSearch({
			query,
			sort: v,
		});
	};
	const setQuery = (v: string) => {
		setSearch({
			query: v,
			sort,
		});
	};
	return (
		<main className="flex flex-col gap-5 p-2 overflow-auto">
			<div className="flex items-center gap-10">
				<Sort sort={sort} setSort={setSort} />
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
					if (sort === "asc") {
						raw.sort((a, b) => a.name.localeCompare(b.name));
					} else {
						raw.sort((a, b) => b.name.localeCompare(a.name));
					}
					const products =
						query === ""
							? raw
							: raw.filter(
									(product) =>
										product.name.toLowerCase().includes(query.toLowerCase()) ||
										(product.barcode !== null && product.barcode.toString().includes(query))
							  );
					return <ProductList products={products} />;
				}}
			</Await>
		</main>
	);
}

const useItems = () => {
	const db = useDb();
	const items = useFetch(db.product.getAll(), []);
	return items;
};

function getOption(search: URLSearchParams): {
	sort: "asc" | "desc";
	query: string;
} {
	const s = z.enum(["asc", "desc"]).safeParse(search.get("sort"));
	const sort = s.success ? s.data : "asc";
	const query = search.get("query") ?? "";
	return { sort, query };
}
