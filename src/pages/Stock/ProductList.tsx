import { SquareArrowOutUpRight } from "lucide-react";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableScrollable,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { ProductResult } from "~/hooks/useProductSearch";


type Props = {
	products: ProductResult[];
	start: number;
	end: number;
};

export function ProductList({ products, start, end }: Props) {
	return (
		<TableScrollable className="text-3xl">
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
									<SquareArrowOutUpRight size={35} />
								</Link>
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</TableScrollable>
	);
}

