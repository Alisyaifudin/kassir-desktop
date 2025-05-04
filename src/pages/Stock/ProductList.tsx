import { Pencil } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Link } from "react-router";
import { useEffect } from "react";

const ITEM_PER_PAGE = 100;

export function ProductListPromise({
	raw,
	query,
	setPagination,
	sortBy,
	sortDir,
	rawPage,
}: {
	raw: DB.Product[];
	query: string;
	setPagination: (page: number, total: number) => void;
	sortBy: "name" | "price" | "capital" | "barcode" | "stock";
	sortDir: "desc" | "asc";
	rawPage: number;
}) {
	const products =
		query === ""
			? raw
			: raw.filter(
					(product) =>
						product.name.toLowerCase().includes(query.toLowerCase()) ||
						(product.barcode !== null && product.barcode.toString().includes(query))
			  );
	sorting(products, sortBy, sortDir);
	const totalItem = products.length;
	const totalPage = Math.ceil(totalItem / ITEM_PER_PAGE);
	const page = rawPage > totalPage ? totalPage : rawPage;
	useEffect(() => {
		if (raw === null) {
			return;
		}
		setPagination(page, totalPage);
	}, [page, totalPage]);
	const start = ITEM_PER_PAGE * (page - 1);
	const end = ITEM_PER_PAGE * page;
	return <ProductList products={products} start={start} end={end} />;
}

type Props = {
	products: DB.Product[];
	start: number;
	end: number;
};

function ProductList({ products, start, end }: Props) {
	return (
		<Table className="text-3xl">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[50px]">No</TableHead>
					<TableHead className="w-[250px]">Barcode</TableHead>
					<TableHead>Nama</TableHead>
					<TableHead className="text-right w-[150px]">Harga</TableHead>
					<TableHead className="text-right w-[150px]">Modal</TableHead>
					<TableHead className="text-right w-[100px]">Stok</TableHead>
					<TableHead className="w-[50px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{products.slice(start, end).map((product, i) => (
					<TableRow key={i}>
						<TableCell>{i + 1 + start}</TableCell>
						<TableCell>{product.barcode ?? ""}</TableCell>
						<TableCell>{product.name}</TableCell>
						<TableCell className="text-right">{product.price.toLocaleString("id-ID")}</TableCell>
						<TableCell className="text-right">{product.capital.toLocaleString("id-ID")}</TableCell>
						<TableCell className="text-right">{product.stock}</TableCell>
						<TableCell>
							<Button variant="link" className="p-0" asChild>
								<Link to={`/stock/${product.id}`}>
									<Pencil />
								</Link>
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
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
