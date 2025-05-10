import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { ProductRecord } from "~/database/product";

export function Product({
	products: all,
	mode,
	start,
	end,
}: {
	products: ProductRecord[];
	mode: "sell" | "buy";
	start: number;
	end: number;
}) {
	const products: ProductRecord[] = [];
	for (const p of all) {
		if (p.timestamp < start || p.timestamp > end || p.mode !== mode) {
			continue;
		}
		const findIndex = products.findIndex((product) => product.id === p.id);
		if (findIndex === -1) {
			products.push(p);
		} else {
			products[findIndex].qty += p.qty;
		}
	}
	return (
		<Table className="overflow-auto text-3xl">
			<TableHeader>
				<TableRow>
					<TableHead className="w-[60px]">No</TableHead>
					<TableHead className="w-[150px]">Barcode</TableHead>
					<TableHead>Nama</TableHead>
					<TableHead className="text-end w-[140px]">Harga</TableHead>
					<TableHead className="text-end w-[140px]">Modal</TableHead>
					<TableHead className="w-[100px]">Jumlah</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{products.map((product, i) => (
					<TableRow key={product.id}>
						<TableCell className="font-medium">{i + 1}</TableCell>
						<TableCell>{product.barcode ?? ""}</TableCell>
						<TableCell>{product.name}</TableCell>
						<TableCell className="text-end">{product.price.toLocaleString("id-ID")}</TableCell>
						<TableCell className="text-end">{product.capital.toLocaleString("id-ID")}</TableCell>
						<TableCell className="text-end">{product.qty}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
