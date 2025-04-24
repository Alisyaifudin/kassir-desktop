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

type Props = {
	products: DB.Product[];
};

export function ProductList({ products }: Props) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[50px]">No</TableHead>
					<TableHead className="w-[200px]">Barcode</TableHead>
					<TableHead>Nama</TableHead>
					<TableHead className="text-right w-[100px]">Harga</TableHead>
					<TableHead className="text-right w-[50px]">Stok</TableHead>
					<TableHead className="w-[50px]"></TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{products.map((product, i) => (
					<TableRow key={i}>
						<TableCell>{i + 1}</TableCell>
						<TableCell>{product.barcode ?? ""}</TableCell>
						<TableCell>{product.name}</TableCell>
						<TableCell className="text-right">
							{product.price.toLocaleString("id-ID")}
						</TableCell>
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
